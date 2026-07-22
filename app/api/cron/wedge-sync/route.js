import crypto from 'node:crypto'
import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { runGrantAdapter } from '@/lib/sourcing/grant-adapter'
import { runEventHostAdapter } from '@/lib/sourcing/event-host-adapter'
import {
  isLedgerEnabled,
  recordObservations,
  upsertSourceCheck,
  countLedgerEntities,
} from '@/lib/server/truth-ledger'

export const maxDuration = 60

/**
 * Data-wedge sync — the repeatability cron (docs/rebuild-plan.md Phase 2).
 *
 * 1. Observes the FULL community corpus (incubator + grant + event-host
 *    adapters) onto the truth ledger — not just the flow-ready subset —
 *    so every entity gets a server-side first-seen.
 * 2. Watches the community announcement pages for content changes so new
 *    cohorts are DETECTED automatically instead of "manual quarterly".
 *    Extraction stays curated (we never auto-invent founders/domains);
 *    detection is what this automates. Changes alert via Slack.
 *
 * Auth: Authorization: Bearer CRON_SECRET
 */

const WATCHED_SOURCES = [
  { label: 'Velocity — news / cohort announcements', url: 'https://www.velocityincubator.com/news' },
  { label: 'DMZ — startup directory', url: 'https://dmz.torontomu.ca/startup-directory' },
  { label: 'DMZ — posts', url: 'https://dmz.torontomu.ca/blog' },
]

function visibleTextHash(html) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
  return crypto.createHash('sha256').update(text).digest('hex')
}

async function checkSource({ url, label }) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MeridianSourceWatch/1.0 (+cohort freshness check)' },
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
    })
    if (!res.ok) return { url, label, ok: false, status: res.status }
    const hash = visibleTextHash(await res.text())
    const { changed } = await upsertSourceCheck({ url, label, hash })
    return { url, label, ok: true, changed }
  } catch (e) {
    return { url, label, ok: false, error: e.message }
  }
}

async function postSlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL?.trim()
  if (!url) return { sent: false, reason: 'SLACK_WEBHOOK_URL not set' }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return { sent: res.ok }
}

function adapterEntitiesToCompanies(entities) {
  return entities.map(e => ({
    name: e.companyName,
    domain: e.domain,
    source: e.source,
    provenance: e.provenance,
    cohortDate: e.sourceMeta?.cohortDate || null,
    sourceMeta: { program: e.sourceMeta?.program || null, cohortDate: e.sourceMeta?.cohortDate || null },
  })).filter(c => c.name)
}

export async function GET(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isLedgerEnabled()) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 })
  }

  // 1. Full corpus onto the ledger
  const entities = [
    ...runIncubatorAdapter(),
    ...runGrantAdapter(),
    ...runEventHostAdapter(),
  ]
  const companies = adapterEntitiesToCompanies(entities)
  const before = await countLedgerEntities()
  const observed = await recordObservations(companies)
  const after = await countLedgerEntities()

  // 2. Source watchers
  const watches = []
  for (const source of WATCHED_SOURCES) {
    watches.push(await checkSource(source))
  }
  const changedSources = watches.filter(w => w.changed)
  let slack = null
  if (changedSources.length) {
    slack = await postSlack(
      `Meridian source watch — content changed:\n${changedSources
        .map(w => `• ${w.label}\n  ${w.url}`)
        .join('\n')}\nReview for a new cohort and update the adapter.`
    )
  }

  return Response.json({
    ok: true,
    corpus: companies.length,
    ledgerBefore: before,
    ledgerAfter: after,
    newEntities: after - before,
    observed: Object.keys(observed).length,
    watches,
    changedSources: changedSources.length,
    slack,
    at: new Date().toISOString(),
  })
}
