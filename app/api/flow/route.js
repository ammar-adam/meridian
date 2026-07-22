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

export const maxDuration = 30

/** Convert durable company records into flow-shaped rows. */
function recordsToFlowCompanies(rows = []) {
  return rows.map((c) => ({
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

  return Response.json({
    companies: withLedger,
    meta: {
      ...payload.meta,
      ledger: ledgerSummary(withLedger),
      truthLedger,
      recordsMerged,
      flow: true,
      thesis: text,
      generatedAt: new Date().toISOString(),
    },
    cached: false,
  })
}
