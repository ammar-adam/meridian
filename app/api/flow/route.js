import { enforceRateLimit } from '@/lib/api-guard'
import { buildIncubatorFlowDiscover } from '@/lib/discover-fast'
import { buildCoverageProof } from '@/lib/coverage-proof'
import { buildLedgerEntry, ledgerSummary } from '@/lib/freshness-ledger'
import {
  isLedgerEnabled,
  recordObservations,
  getLatestIndexChecks,
  normalizeEntityId,
} from '@/lib/server/truth-ledger'

export const maxDuration = 30

/** Merge server-side truth-ledger facts (Meridian first-seen, dated index checks) into rows. */
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

    // Re-derive ledger + coverage from dated checks — never patch labels by hand.
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
 * Sync community path — the product funds would pay to check daily.
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
  const { companies, truthLedger } = await withTruthLedger(payload.companies)

  return Response.json({
    companies,
    meta: {
      ...payload.meta,
      ledger: ledgerSummary(companies),
      truthLedger,
      flow: true,
      thesis: text,
      generatedAt: new Date().toISOString(),
    },
    cached: false,
  })
}
