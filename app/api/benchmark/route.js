import { isLedgerEnabled, benchmarkStats, listLedgerEntities, getLatestIndexChecks, listSourceWatches, attestationCounts } from '@/lib/server/truth-ledger'
import { indexCheckIfStale } from '@/lib/server/index-check-batch'
import { countCompanies } from '@/lib/server/company-records'
import { isSourceRegistryEnabled, listActiveSources } from '@/lib/server/source-registry'
import { bulkFillIfBelowTarget } from '@/lib/server/bulk-fill-opportunistic'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Public earliness benchmark — computed from the live truth ledger.
 * Every number here traces to a database row; nothing is asserted.
 * Also opportunistically advances index checks when the ledger is unchecked.
 */
export async function GET() {
  if (!isLedgerEnabled()) {
    return Response.json({ enabled: false, reason: 'ledger not configured' })
  }

  let indexCheck = null
  let bulkFill = null
  try {
    indexCheck = await indexCheckIfStale({ limit: 5 })
  } catch (e) {
    indexCheck = { ran: false, error: e.message }
  }
  try {
    bulkFill = await bulkFillIfBelowTarget({ target: 1500, queryBatch: 20, scrapeLimit: 8 })
  } catch (e) {
    bulkFill = { ran: false, error: e.message }
  }

  const stats = await benchmarkStats()
  if (!stats) {
    return Response.json({ enabled: false, reason: 'ledger unavailable' })
  }

  const entities = await listLedgerEntities(100)
  const checks = await getLatestIndexChecks(entities.map(e => e.id))
  const sourceWatches = await listSourceWatches()
  const attestations = await attestationCounts()
  const companyCount = await countCompanies()
  let sourceCount = 0
  if (isSourceRegistryEnabled()) {
    const sources = await listActiveSources({ limit: 500 })
    sourceCount = sources.length
  }

  const rows = entities.map(e => ({
    name: e.name,
    domain: e.domain,
    source: e.source,
    program: e.program,
    cohortDate: e.cohort_date,
    firstObservedAt: e.first_observed_at,
    checks: (checks[e.id] || []).map(c => ({
      index: c.indexName,
      present: c.present,
      checkedAt: c.checkedAt,
    })),
  }))

  return Response.json({
    enabled: true,
    stats: {
      ...stats,
      companyRecords: companyCount,
      registeredSources: sourceCount,
    },
    rows,
    sourceWatches: sourceWatches.map(w => ({
      label: w.label,
      url: w.url,
      lastCheckedAt: w.last_checked_at,
      lastChangedAt: w.last_changed_at,
      checkCount: w.check_count,
    })),
    attestations: attestations || { total: 0, confirmed: 0, pending: 0 },
    indexCheck,
    bulkFill,
    honesty: {
      firstObservedAt: 'Timestamp of when Meridian first recorded the company server-side. Accrues from ledger launch; never backdated.',
      indexChecks: 'Falsifiable name searches against public indexes, stored with dates. Harmonic checks planned; StartupHub live via scheduled sweep + opportunistic batches.',
      preAnnouncementSignals: 'Companies detected via new-incorporation + live-domain cross-reference — before any announcement, cohort, or index.',
      attestations: 'Founder claims are stored pending and marked confirmed only after manual verification.',
      claim: 'We only claim absence where a dated check exists. Everything else is community-sourced, unverified against indexes.',
      accruing: 'Until entitiesChecked > 0, verifiedMisses and medianMissAgeDays stay at zero / null — we do not invent earliness numbers.',
    },
    at: new Date().toISOString(),
  })
}
