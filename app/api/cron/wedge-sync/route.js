import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { runGrantAdapter } from '@/lib/sourcing/grant-adapter'
import { runEventHostAdapter } from '@/lib/sourcing/event-host-adapter'
import { checkAllSources } from '@/lib/server/source-watch'
import {
  isLedgerEnabled,
  recordObservations,
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
  const watches = await checkAllSources()
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
