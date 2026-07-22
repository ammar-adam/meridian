import { enforceRateLimit } from '@/lib/api-guard'
import { buildIncubatorFlowDiscover } from '@/lib/discover-fast'
import { buildCoverageProof, annotateCoverage, coverageSummary } from '@/lib/coverage-proof'
import { buildLedgerEntry, ledgerSummary, annotateLedger } from '@/lib/freshness-ledger'
import { annotateReachability, reachabilitySummary } from '@/lib/reachability'
import {
  isLedgerEnabled,
  recordObservations,
  getLatestIndexChecks,
  normalizeEntityId,
} from '@/lib/server/truth-ledger'
import { isRecordsEnabled, listCompanies } from '@/lib/server/company-records'
import { matchMandate } from '@/lib/server/mandate-match'
import { filterFlowFeed } from '@/lib/flow-quality'
import { flagSerialFounders, getSerialFounderFlags } from '@/lib/server/founder-graph'
import { resolveActorId } from '@/lib/actor-id'
import { detectWatchEvents, dedupeWatchEvents } from '@/lib/server/watch-events'
import { dispatchWatchWebhooks } from '@/lib/server/watch-webhooks'
import { computeFlowFeedStats } from '@/lib/flow-feed-stats'

export const maxDuration = 30

/** Convert durable company records into flow-shaped rows. */
function recordsToFlowCompanies(rows = []) {
  return rows.map((c) => ({
    companyId: c.id,
    name: c.name,
    domain: c.domain || null,
    description: c.one_liner || '',
    geography: c.geography || null,
    stage: c.stage || null,
    sectors: c.sectors || null,
    sector: Array.isArray(c.sectors) ? c.sectors.join(' / ') : null,
    source: 'record',
    provenance: `Company record · first observed ${String(c.first_observed_at || '').slice(0, 10)}`,
    cohortDate: null,
    sourceMeta: {
      geography: c.geography || null,
      stage: c.stage || null,
    },
    meridianFirstSeen: c.first_observed_at,
  }))
}

function mergeByKey(primary, extra) {
  const map = new Map()
  for (const c of [...extra, ...primary]) {
    const key = (c.domain || c.name || '').toLowerCase().trim()
    if (!key) continue
    const prev = map.get(key)
    if (!prev) {
      map.set(key, c)
      continue
    }
    // Prefer incubator seed enrichment (founders) over bare records.
    map.set(key, {
      ...c,
      ...prev,
      personName: prev.personName || c.personName,
      domain: prev.domain || c.domain,
      provenance: prev.provenance || c.provenance,
      meridianFirstSeen: prev.meridianFirstSeen || c.meridianFirstSeen,
    })
  }
  return [...map.values()]
}

function splitFounderNames(personName) {
  if (!personName) return []
  return String(personName)
    .split(/,| & | and /i)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Serial-founder flags from in-feed founder names + DB links when available. */
async function annotateSerialFounders(companies = []) {
  if (!companies.length) return companies

  const links = []
  for (const c of companies) {
    const companyId = c.companyId || c.domain || c.name
    for (const name of splitFounderNames(c.personName)) {
      links.push({ personId: name.toLowerCase(), companyId, companyName: c.name })
    }
  }
  const inferred = flagSerialFounders(links)

  const dbIds = [...new Set(companies.map(c => c.companyId).filter(Boolean))]
  let dbFlags = {}
  if (dbIds.length) {
    try {
      dbFlags = await getSerialFounderFlags(dbIds)
    } catch { /* optional */ }
  }

  return companies.map((c) => {
    const key = c.companyId || c.domain || c.name
    const flag = dbFlags[c.companyId] || inferred[key]
    if (!flag?.serial) return c
    return {
      ...c,
      serialFounder: true,
      priorCompanies: flag.priorCompanies?.slice(0, 4) || [],
    }
  })
}

/** Merge server-side truth-ledger facts into rows. */
async function withTruthLedger(companies) {
  if (!isLedgerEnabled() || !companies?.length) {
    return { companies, truthLedger: { enabled: false } }
  }
  const observed = await recordObservations(companies)
  const checks = await getLatestIndexChecks(Object.keys(observed))

  const merged = companies.map((c) => {
    const id = normalizeEntityId(c.name)
    const obs = observed[id]
    const entityChecks = checks[id]
    if (!obs && !entityChecks?.length) return c

    const withChecks = entityChecks?.length
      ? { ...c, checks: entityChecks, indexChecks: entityChecks }
      : { ...c }

    const ledger = buildLedgerEntry(withChecks)
    if (obs) ledger.meridianFirstSeen = obs.firstObservedAt
    if (entityChecks?.length) ledger.indexChecks = entityChecks

    const coverage = buildCoverageProof(withChecks)

    return {
      ...withChecks,
      ledger,
      coverage,
      notInHarmonicLikely: coverage.notInHarmonicLikely,
    }
  })

  return {
    companies: merged,
    truthLedger: { enabled: true, observed: Object.keys(observed).length },
  }
}

/**
 * Continuous deal-flow feed for a fund mandate.
 * Incubator seeds + durable company records, mandate-matched.
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const { thesis, fundContext } = await req.json()
  const text = (thesis || fundContext?.thesis || '').trim()

  if (!fundContext?.fundName) {
    return Response.json({ error: 'Choose a fund to watch deal flow' }, { status: 400 })
  }

  if (!text) {
    return Response.json({ error: 'Mandate thesis required' }, { status: 400 })
  }

  const payload = buildIncubatorFlowDiscover(text, fundContext)
  let companies = payload.companies || []
  let recordsMerged = 0

  if (isRecordsEnabled()) {
    try {
      const rows = await listCompanies({ limit: 200 })
      if (rows.length) {
        const fromRecords = recordsToFlowCompanies(rows)
        const before = companies.length
        const merged = mergeByKey(companies, fromRecords)
        const rematched = matchMandate(
          annotateReachability(annotateLedger(annotateCoverage(merged))),
          { thesis: text, fundContext },
        )
        companies = rematched.companies
        recordsMerged = Math.max(0, companies.length - before)
        payload.meta = {
          ...payload.meta,
          coverageBanner: rematched.meta.coverageBanner,
          canadianMandate: rematched.meta.canadianMandate,
          match: rematched.meta,
          coverage: coverageSummary(companies),
          reachability: reachabilitySummary(companies),
          ledger: ledgerSummary(companies),
        }
      }
    } catch (e) {
      console.warn('[flow] company records merge skipped:', e.message)
    }
  }

  const { companies: withLedger, truthLedger } = await withTruthLedger(companies)
  const withSerial = await annotateSerialFounders(withLedger)
  const { companies: feedCompanies, hiddenCount } = filterFlowFeed(withSerial)
  const feedStats = computeFlowFeedStats(feedCompanies)

  let watchEvents = dedupeWatchEvents(detectWatchEvents(feedCompanies))
  let webhooks = { dispatched: 0, skipped: true }
  try {
    const actorId = await resolveActorId(req)
    webhooks = await dispatchWatchWebhooks(watchEvents, {
      actorId,
      fundName: fundContext.fundName,
      thesis: text,
    })
  } catch { /* optional */ }

  return Response.json({
    companies: feedCompanies,
    meta: {
      ...payload.meta,
      ledger: ledgerSummary(feedCompanies),
      truthLedger,
      recordsMerged,
      thinRowsHidden: hiddenCount,
      flow: true,
      thesis: text,
      feedStats,
      watchEvents: watchEvents.slice(0, 20),
      webhooks,
      generatedAt: new Date().toISOString(),
    },
    cached: false,
  })
}
