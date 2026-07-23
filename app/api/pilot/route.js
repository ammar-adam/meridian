import { buildPilotCaseStudy } from '@/lib/pilot-case'
import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { runGrantAdapter } from '@/lib/sourcing/grant-adapter'
import {
  isLedgerEnabled,
  countLedgerEntities,
  recordObservations,
  benchmarkStats,
} from '@/lib/server/truth-ledger'
import { checkSourcesIfStale } from '@/lib/server/source-watch'
import { ensureCompanyRecords } from '@/lib/server/records-backfill'
import { ingestIfStale } from '@/lib/server/ingest-batch'
import { indexCheckIfStale } from '@/lib/server/index-check-batch'
import { bulkFillIfBelowTarget } from '@/lib/server/bulk-fill-opportunistic'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/** Backfill the full corpus onto the truth ledger once, without cron ops. */
async function ensureCorpusObserved() {
  if (!isLedgerEnabled()) return { enabled: false }
  try {
    const entities = [...runIncubatorAdapter(), ...runGrantAdapter()]
    const count = await countLedgerEntities()
    if (count >= entities.length) return { enabled: true, count, corpus: entities.length, skipped: true }
    const observed = await recordObservations(entities.map(e => ({
      name: e.companyName,
      domain: e.domain,
      source: e.source,
      provenance: e.provenance,
      cohortDate: e.sourceMeta?.cohortDate || null,
      sourceMeta: { program: e.sourceMeta?.program || null },
    })).filter(c => c.name))
    return { enabled: true, count, corpus: entities.length, observed: Object.keys(observed).length }
  } catch (e) {
    console.error('[pilot] corpus backfill:', e.message)
    return { enabled: true, error: e.message }
  }
}

export async function GET() {
  const ledgerSync = await ensureCorpusObserved()
  let recordsSync = null
  try {
    recordsSync = await ensureCompanyRecords()
  } catch (e) {
    recordsSync = { error: e.message }
  }
  // Run source watchers at most daily, without cron ops.
  let sourceWatch = null
  try {
    sourceWatch = await checkSourcesIfStale(24)
  } catch (e) {
    sourceWatch = { ran: false, error: e.message }
  }

  // Opportunistic: seed sources + extract 1 stale page; run a few index checks
  // so the corpus and verifiedMisses grow without GitHub Actions secrets.
  let ingest = null
  let indexCheck = null
  try {
    indexCheck = await indexCheckIfStale({ limit: 20 })
  } catch (e) {
    indexCheck = { ran: false, error: e.message }
  }
  try {
    ingest = await ingestIfStale({ maxAgeHours: 12, limit: 5 })
  } catch (e) {
    ingest = { ran: false, error: e.message }
  }

  let bulkFill = null
  try {
    bulkFill = await bulkFillIfBelowTarget({ target: 2500, queryBatch: 35, scrapeLimit: 14 })
  } catch (e) {
    bulkFill = { ran: false, error: e.message }
  }

  const study = buildPilotCaseStudy()
  if (isLedgerEnabled()) {
    try {
      const bench = await benchmarkStats()
      if (bench) {
        study.metrics.verifiedMiss = bench.verifiedMisses ?? study.metrics.verifiedMiss
        study.metrics.medianAgeDays = bench.medianMissAgeDays ?? study.metrics.medianAgeDays
        study.metrics.withFirstSeen = bench.entities ?? study.metrics.withFirstSeen
        study.metrics.ledgerEntities = bench.entities
        study.metrics.entitiesChecked = bench.entitiesChecked
        study.headlineMetrics = {
          companyRecords: bench.companyRecords,
          entitiesChecked: bench.entitiesChecked,
          verifiedMisses: bench.verifiedMisses,
          entities: bench.entities,
          registeredSources: bench.registeredSources,
          source: 'truth_ledger',
        }
      }
    } catch (e) {
      study.benchmarkError = e.message
    }
  }

  return Response.json({
    ...study,
    ledgerSync,
    recordsSync,
    sourceWatch,
    ingest,
    indexCheck,
    bulkFill,
  })
}
