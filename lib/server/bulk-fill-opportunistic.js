import { countCompanies, recordSighting } from '@/lib/server/company-records'
import { recordObservations } from '@/lib/server/truth-ledger'
import { isStartupHubConfigured } from '@/lib/startuphub'
import { runStartupHubBulk, STARTUPHUB_BULK_QUERIES } from '@/lib/server/startuphub-bulk'
import { seedSourcesFromBundledFile, runIngestBatch } from '@/lib/server/ingest-batch'
import { runDomainRegistryAdapter } from '@/lib/sourcing/domain-registry-adapter'
import { runFormDAdapter } from '@/lib/sourcing/form-d-adapter'

let _lastRunAt = 0
const MIN_INTERVAL_MS = 60 * 1000 // 1 min between runs on warm instances when below target

/** Light keyword sets for force fills — keep within Vercel maxDuration. */
const FORCE_REGISTRY_KEYWORDS = [
  ['ai', 'tech', 'software', 'labs', 'data', 'robotics'],
  ['fintech', 'health', 'climate', 'quantum', 'bio', 'security'],
]

/**
 * Opportunistic corpus growth when below target — safe for /api/pilot and /api/benchmark.
 * Rotates StartupHub query offset by hour; throttled per server instance.
 * When force=true, also runs registry + Form D (no API keys) for volume beyond StartupHub quota.
 */
export async function bulkFillIfBelowTarget({
  target = 2500,
  queryBatch = 30,
  scrapeLimit = 12,
  force = false,
} = {}) {
  const before = await countCompanies()
  if (before == null) return { ran: false, reason: 'db_off' }
  if (before >= target) return { ran: false, reason: 'target_met', before, target }

  const now = Date.now()
  if (!force && now - _lastRunAt < MIN_INTERVAL_MS) {
    return { ran: false, reason: 'throttled', before, target }
  }

  const out = { ran: true, before, target, phases: {} }

  if (isStartupHubConfigured()) {
    const hour = new Date().getUTCHours()
    // On force, rotate by minute so multi-round GH Actions don't repeat the same query
    const offset = force
      ? (Math.floor(Date.now() / 60_000) * Math.max(1, Math.min(queryBatch, 5))) % STARTUPHUB_BULK_QUERIES.length
      : (hour * queryBatch) % STARTUPHUB_BULK_QUERIES.length
    out.phases.startuphub = await runStartupHubBulk({
      offset,
      queryBatch: force ? Math.min(queryBatch, 8) : queryBatch,
      perQueryLimit: 100,
      delayMs: 280,
    })
  } else {
    out.phases.startuphub = { enabled: false, reason: 'STARTUPHUB_API_KEY not configured' }
  }

  // Free volume sources — only on force to keep pilot/benchmark latency bounded
  if (force && (await countCompanies()) < target) {
    out.phases.registry = await runRegistryPhase({ limitPerSet: 120 })
  }
  if (force && (await countCompanies()) < target) {
    out.phases.formd = await runFormDPhase({ limit: 40 })
  }

  if ((await countCompanies()) < target && process.env.ANTHROPIC_API_KEY?.trim()) {
    out.phases.seed = await seedSourcesFromBundledFile()
    out.phases.scrape = await runIngestBatch({ cadence: 'daily', limit: scrapeLimit, ignoreHash: true })
  }

  out.after = await countCompanies()
  out.delta = (out.after ?? 0) - before
  _lastRunAt = now
  return out
}

async function runRegistryPhase({ limitPerSet = 120 } = {}) {
  let newSightings = 0
  const errors = []
  for (const keywords of FORCE_REGISTRY_KEYWORDS) {
    try {
      const { entities } = await runDomainRegistryAdapter({
        keywords,
        province: '',
        limit: limitPerSet,
        concurrency: 20,
      })
      for (const e of entities || []) {
        const r = await recordSighting({
          name: e.companyName,
          domain: e.domain,
          sourceType: 'registry',
          sourceId: 'domain_registry',
          provenance: e.provenance,
          geography: e.sourceMeta?.geography || 'Canada',
          stage: e.sourceMeta?.stage || 'pre-seed',
          raw: { sourceMeta: e.sourceMeta },
        })
        if (r?.sightingId) newSightings += 1
        if (r?.companyId) {
          await recordObservations([{
            name: e.companyName,
            domain: e.domain,
            source: 'domain_registry',
            provenance: e.provenance,
          }])
        }
      }
    } catch (e) {
      errors.push(e.message)
    }
  }
  return { enabled: true, newSightings, errors: errors.length ? errors : undefined }
}

async function runFormDPhase({ limit = 80 } = {}) {
  let newSightings = 0
  try {
    const { entities, error } = await runFormDAdapter({ limit, days: 90 })
    for (const e of entities || []) {
      const r = await recordSighting({
        name: e.companyName,
        sourceType: 'capital',
        sourceId: 'form_d',
        provenance: e.provenance || 'SEC Form D · candidate',
        geography: 'US',
        raw: { sourceMeta: e.sourceMeta },
      })
      if (r?.sightingId) newSightings += 1
      if (r?.companyId) {
        await recordObservations([{
          name: e.companyName,
          source: 'form_d',
          provenance: e.provenance,
        }])
      }
    }
    return { enabled: true, newSightings, fetched: entities?.length || 0, error: error || null }
  } catch (e) {
    return { enabled: true, newSightings: 0, error: e.message }
  }
}
