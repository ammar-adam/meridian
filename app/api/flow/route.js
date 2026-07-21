import { enforceRateLimit } from '@/lib/api-guard'
import { buildIncubatorFlowDiscover } from '@/lib/discover-fast'
import { ledgerSummary } from '@/lib/freshness-ledger'
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

    const ledger = { ...(c.ledger || {}) }
    if (obs) ledger.meridianFirstSeen = obs.firstObservedAt
    if (entityChecks?.length) {
      ledger.indexChecks = entityChecks
      const miss = entityChecks.find(x => x.present === false)
      if (miss && ledger.verification?.status !== 'verified_miss') {
        const testedAt = String(miss.checkedAt).slice(0, 10)
        ledger.indexTest = { index: miss.indexName, result: 'no name match', testedAt }
        ledger.verification = {
          status: 'verified_miss',
          label: `Not in ${miss.indexName}`,
          detail: `Name search returned no match (checked ${testedAt}).`,
          checkable: true,
        }
      }
    }
    return { ...c, ledger }
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
