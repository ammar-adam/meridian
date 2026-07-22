import { isCanadianMandate, normalizeGeographies } from '@/lib/geography-utils'
import { runDomainRegistryAdapter } from '@/lib/sourcing/domain-registry-adapter'
import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { runGrantAdapter } from '@/lib/sourcing/grant-adapter'
import { runEventHostAdapter } from '@/lib/sourcing/event-host-adapter'
import { resolveEntities } from '@/lib/sourcing/entity-resolver'
import { entitiesToDiscoverSeeds } from '@/lib/sourcing/entity-schema'

/**
 * Run community-access source adapters, resolve entities, map to Discover seeds.
 */
export async function runSourcingAdapters({ parsed, thesis, fundContext, resolve = true } = {}) {
  const geos = normalizeGeographies(parsed?.geographies, fundContext)
  const canadian = isCanadianMandate(geos, fundContext)
  const keywords = [
    ...(parsed?.keywords || []),
    ...(parsed?.sectors || []),
  ].map(k => String(k).toLowerCase()).filter(Boolean)

  // Prefer fintech/AI-ish tokens for registry filter when thesis is thin
  const registryKeywords = keywords.length
    ? keywords.slice(0, 8)
    : ['fintech', 'pay', 'software', 'ai', 'data', 'tech', 'capital', 'finance']

  const incubatorEntities = runIncubatorAdapter()
  const grantEntities = runGrantAdapter()
  const eventEntities = runEventHostAdapter()

  // Domain registry is no longer Canada-gated (Slice B). Run whenever we have
  // keywords; keep a reasonable probe limit so request-time callers stay bounded.
  let domainEntities = []
  let domainStats = null
  try {
    const result = await runDomainRegistryAdapter({
      keywords: registryKeywords,
      province: '',
      limit: 120,
      concurrency: 20,
    })
    domainEntities = result.entities
    domainStats = result.stats
  } catch (err) {
    console.warn('[sourcing] domain registry adapter failed:', err.message)
    domainStats = { error: err.message }
  }

  // Resolve person↔company only for high/medium-trust sources. Domain registry
  // is high-volume + low-confidence — resolving every row burns Perplexity and
  // can invent founder links. Ranker still sees registry seeds as-is.
  const toResolve = [...incubatorEntities, ...grantEntities, ...eventEntities]
  const resolvedCore = resolve
    ? await resolveEntities(toResolve, { resolveMissing: true, concurrency: 2 })
    : toResolve
  const combined = [...resolvedCore, ...domainEntities]
  const resolved = combined

  const seeds = entitiesToDiscoverSeeds(resolved)

  return {
    entities: resolved,
    seeds,
    meta: {
      incubatorCount: incubatorEntities.length,
      grantCount: grantEntities.length,
      eventHostCount: eventEntities.length,
      domainRegistryCount: domainEntities.length,
      resolvedCount: resolved.length,
      seedCount: seeds.length,
      domainStats,
      canadianMandate: canadian,
    },
  }
}
