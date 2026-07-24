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
  const params = new URL(req.url).searchParams
  const force = params.get('force') === '1'
  const statusOnly = params.get('status') === '1'
  const target = Number(params.get('target') || 2500) || 2500

  const before = await countCompanies()

  // Fast path for smoke / dashboards — no StartupHub or scrape work.
  if (statusOnly) {
    return Response.json({
      ok: true,
      target,
      companyRecords: before,
      delta: 0,
      bulkFill: { ran: false, reason: 'status_only' },
      at: new Date().toISOString(),
      hint: before != null && before < target
        ? 'Corpus below target — use ?force=1 or school-coverage cron'
        : 'Target met',
    })
  }

  let bulkFill = null
  let indexCheck = null

  try {
    indexCheck = await indexCheckIfStale({ limit: force ? 40 : 10, force })
  } catch (e) {
    indexCheck = { ran: false, error: e.message }
  }

  try {
    bulkFill = await bulkFillIfBelowTarget({
      target,
      queryBatch: force ? 25 : 12,
      scrapeLimit: force ? 12 : 6,
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
      ? 'Corpus below target — school-coverage cron + /api/pilot advance fill'
      : 'Target met',
  })
}
