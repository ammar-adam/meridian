import { countCompanies } from '@/lib/server/company-records'
import { isStartupHubConfigured } from '@/lib/startuphub'
import { runStartupHubBulk, STARTUPHUB_BULK_QUERIES } from '@/lib/server/startuphub-bulk'
import { seedSourcesFromBundledFile, runIngestBatch } from '@/lib/server/ingest-batch'

let _lastRunAt = 0
const MIN_INTERVAL_MS = 8 * 60 * 1000 // at most once per 8 minutes per instance

/**
 * Opportunistic corpus growth when below target — safe for /api/pilot and /api/benchmark.
 * Rotates StartupHub query offset by hour; throttled per server instance.
 */
export async function bulkFillIfBelowTarget({
  target = 1500,
  queryBatch = 20,
  scrapeLimit = 8,
  force = false,
} = {}) {
  const now = Date.now()
  if (!force && now - _lastRunAt < MIN_INTERVAL_MS) {
    return { ran: false, reason: 'throttled' }
  }

  const before = await countCompanies()
  if (before == null) return { ran: false, reason: 'db_off' }
  if (before >= target) return { ran: false, reason: 'target_met', before, target }

  const out = { ran: true, before, target, phases: {} }

  if (isStartupHubConfigured()) {
    const hour = new Date().getUTCHours()
    const offset = (hour * queryBatch) % STARTUPHUB_BULK_QUERIES.length
    out.phases.startuphub = await runStartupHubBulk({
      offset,
      queryBatch,
      perQueryLimit: 100,
      delayMs: 280,
    })
  } else {
    out.phases.startuphub = { enabled: false, reason: 'STARTUPHUB_API_KEY not configured' }
  }

  if ((await countCompanies()) < target && process.env.ANTHROPIC_API_KEY?.trim()) {
    out.phases.seed = await seedSourcesFromBundledFile()
    out.phases.scrape = await runIngestBatch({ cadence: 'daily', limit: scrapeLimit })
  }

  out.after = await countCompanies()
  out.delta = (out.after ?? 0) - before
  _lastRunAt = now
  return out
}
