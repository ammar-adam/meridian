import { countCompanies } from '@/lib/server/company-records'
import { bulkFillIfBelowTarget } from '@/lib/server/bulk-fill-opportunistic'
import { indexCheckIfStale } from '@/lib/server/index-check-batch'
import { isLedgerEnabled, benchmarkStats } from '@/lib/server/truth-ledger'
import { isSourceRegistryEnabled, listActiveSources } from '@/lib/server/source-registry'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Public corpus status + opportunistic growth (no auth).
 * Same safe throttling as /api/benchmark — advances StartupHub bulk, scrape, index checks.
 * Query: ?force=1 bypasses 60s throttle (still capped by Vercel maxDuration).
 */
export async function GET(req) {
  const force = new URL(req.url).searchParams.get('force') === '1'
  const target = Number(new URL(req.url).searchParams.get('target') || 1500) || 1500

  const before = await countCompanies()
  let bulkFill = null
  let indexCheck = null

  try {
    indexCheck = await indexCheckIfStale({ limit: force ? 12 : 8 })
  } catch (e) {
    indexCheck = { ran: false, error: e.message }
  }

  try {
    bulkFill = await bulkFillIfBelowTarget({
      target,
      queryBatch: force ? 35 : 30,
      scrapeLimit: force ? 15 : 12,
      force,
    })
  } catch (e) {
    bulkFill = { ran: false, error: e.message }
  }

  const after = await countCompanies()
  let ledger = null
  if (isLedgerEnabled()) {
    try {
      ledger = await benchmarkStats()
    } catch { /* optional */ }
  }

  let sources = 0
  if (isSourceRegistryEnabled()) {
    try {
      sources = (await listActiveSources({ limit: 500 })).length
    } catch { /* optional */ }
  }

  return Response.json({
    ok: true,
    target,
    companyRecords: after,
    delta: after != null && before != null ? after - before : null,
    registeredSources: sources,
    ledger: ledger ? {
      entities: ledger.entities,
      entitiesChecked: ledger.entitiesChecked,
      verifiedMisses: ledger.verifiedMisses,
    } : null,
    bulkFill,
    indexCheck,
    at: new Date().toISOString(),
    hint: before != null && before < target
      ? 'Corpus below target — Vercel crons and /api/pilot also advance bulk fill'
      : 'Target met',
  })
}
