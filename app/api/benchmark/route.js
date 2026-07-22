import { isLedgerEnabled, benchmarkStats, listLedgerEntities, getLatestIndexChecks, listSourceWatches, attestationCounts } from '@/lib/server/truth-ledger'
import { indexCheckIfStale } from '@/lib/server/index-check-batch'
import { countCompanies } from '@/lib/server/company-records'
import { isSourceRegistryEnabled, listActiveSources } from '@/lib/server/source-registry'
import { bulkFillIfBelowTarget } from '@/lib/server/bulk-fill-opportunistic'
import { buildFlowFeed } from '@/lib/server/flow-feed'
import { PANACHE_VENTURES } from '@/lib/fund-seeds'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Public earliness benchmark — computed from the live truth ledger.
 * Every number here traces to a database row; nothing is asserted.
 * Also opportunistically advances index checks when the ledger is unchecked.
 * Optional: ?thesis=...&fundName=... adds feedStats from the same Flow builder as digest.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const thesisParam = searchParams.get('thesis')?.trim()
  const fundNameParam = searchParams.get('fundName')?.trim()

  if (!isLedgerEnabled()) {
    return Response.json({ enabled: false, reason: 'ledger not configured' })
  }

  let indexCheck = null
  let bulkFill = null
  try {
    indexCheck = await indexCheckIfStale({ limit: 8 })
  } catch (e) {
    indexCheck = { ran: false, error: e.message }
  }
  try {
    bulkFill = await bulkFillIfBelowTarget({ target: 1500, queryBatch: 30, scrapeLimit: 10 })
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

  const referenceThesis = thesisParam || PANACHE_VENTURES.thesis
  const referenceFund = fundNameParam || PANACHE_VENTURES.fundName
  let feedParity = null
  try {
    const feed = await buildFlowFeed({
      thesis: referenceThesis,
      fundContext: {
        fundName: referenceFund,
        thesis: referenceThesis,
        id: PANACHE_VENTURES.id,
      },
    })
    feedParity = {
      mandate: referenceFund,
      thesis: referenceThesis.slice(0, 120),
      feedStats: feed.meta?.feedStats || null,
      scoutMerged: feed.meta?.scoutMerged || 0,
      ledgerVerifiedMisses: stats.verifiedMisses ?? 0,
      note: 'feedStats uses the same builder as /api/flow and /api/digest — ledger stats are entity-wide truth-ledger counts',
    }
  } catch (e) {
    feedParity = { error: e.message }
  }

  return Response.json({
    enabled: true,
    stats: {
      ...stats,
      companyRecords: companyCount,
      registeredSources: sourceCount,
    },
    feedParity,
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
