import { loadAndFindRecentIncorporations } from '@/lib/canada-registry'
import { checkDomainExists, mapPool } from '@/lib/domain-check'
import { entityId } from '@/lib/sourcing/entity-schema'

/** Default probe budget — raised from 25 after timing tests (see SPRINT-GAPS). */
export const DEFAULT_DOMAIN_PROBE_LIMIT = 250
export const DEFAULT_PROBE_CONCURRENCY = 20

/**
 * Score keyword match strength: more distinct keyword hits = higher.
 */
export function keywordMatchScore(name, keywords = []) {
  const hay = String(name || '').toLowerCase()
  let score = 0
  for (const k of keywords) {
    const token = String(k).toLowerCase()
    if (token.length >= 2 && hay.includes(token)) score += 1
  }
  return score
}

/**
 * Prioritize recent incorporations with stronger keyword overlap before probing.
 */
/** Drop obvious non-startup legal entities that keyword-match by accident. */
const NON_STARTUP_NAME = /\b(foundation|church|parish|synagogue|mosque|temple|society|association|club|union|trust|estate of|ministry|congregation|charity|charitable|hospital|school board|district|municipality|township|city of|town of|holding company|holdings limited|real estate|property management|funeral|cemetery)\b/i

/**
 * Known brand collisions / incumbents that look like "new" incorporations in keyword search.
 * Keep lowercase; match against normalized company name.
 */
const BRAND_COLLISION_NAMES = new Set([
  'datacore tech corp',
  'datacore tech corp.',
  'datacore software',
  'doris baird foundation',
  'baird foundation',
  'microsoft',
  'google',
  'amazon',
  'apple',
  'meta platforms',
  'oracle',
  'ibm',
  'shopify',
])

export function looksLikeStartupCandidate(name) {
  const n = String(name || '')
  if (n.length < 3) return false
  if (NON_STARTUP_NAME.test(n)) return false
  const key = n.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim()
  if (BRAND_COLLISION_NAMES.has(key)) return false
  // Drop bare "Inc/Corp" collisions that are mostly surname + tech
  if (/\b(inc|corp|ltd|limited|corporation)\.?$/i.test(n) && n.split(/\s+/).length <= 2 && !/\b(ai|tech|software|labs|bio|health|pay|data)\b/i.test(n)) {
    return false
  }
  return true
}

export function prioritizeRegistryCandidates(matches, keywords = []) {
  return [...matches]
    .filter(m => looksLikeStartupCandidate(m.name))
    .sort((a, b) => {
      const kwDiff = keywordMatchScore(b.name, keywords) - keywordMatchScore(a.name, keywords)
      if (kwDiff !== 0) return kwDiff
      return (b.incorporationTs || 0) - (a.incorporationTs || 0)
    })
}

/**
 * Domain registry + live-domain adapter.
 * Low confidence: incorporation + DNS is a weak signal until thesis-ranked.
 *
 * Decision notes:
 * - Cap was 25 for local iteration speed, not a DNS rate limit. DNS is free/fast;
 *   bottleneck was sequential probing. We now parallelize + raise default to 250.
 * - Candidates are sorted by keyword strength then incorporation recency before
 *   taking the top N, so the budget hits the most promising rows first.
 * - DNS results cached 7d under .cache/domain-check/ to avoid re-probing.
 */
export async function runDomainRegistryAdapter({
  keywords = [],
  province = '',
  sinceDate = null,
  limit = DEFAULT_DOMAIN_PROBE_LIMIT,
  concurrency = DEFAULT_PROBE_CONCURRENCY,
} = {}) {
  const started = Date.now()
  const since = sinceDate || new Date(Date.now() - 540 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { matches, rows, fetchedAt } = await loadAndFindRecentIncorporations({
    keywords,
    province,
    sinceDate: since,
  })

  const prioritized = prioritizeRegistryCandidates(matches, keywords)
  const candidates = prioritized.slice(0, limit)

  const withDomains = await mapPool(candidates, concurrency, async (c) => {
    const domainCheck = await checkDomainExists(c.name)
    return {
      ...c,
      ...domainCheck,
      keywordScore: keywordMatchScore(c.name, keywords),
    }
  })

  const entities = withDomains
    .filter(c => c.resolves && c.domain)
    .map(c => ({
      id: entityId('domreg', c.corporationNumber || c.domain),
      type: 'company',
      personName: null,
      companyName: c.name,
      domain: c.domain,
      source: 'domain_registry',
      confidence: 'low',
      provenance: formatRegistryProvenance(c),
      sourceMeta: {
        corporationNumber: c.corporationNumber,
        incorporationDate: c.incorporationDate,
        province: c.province,
        registrySource: c.registrySource,
        method: c.method,
        keywordScore: c.keywordScore,
        geography: c.province ? `Canada · ${c.province}` : 'Canada',
        sector: '',
        stage: 'pre-seed',
      },
      discoveredAt: new Date().toISOString(),
    }))

  const elapsedMs = Date.now() - started
  const cacheHits = withDomains.filter(c => c.fromCache).length

  return {
    entities,
    stats: {
      registryRows: rows?.length || 0,
      keywordMatches: matches.length,
      probed: withDomains.length,
      resolved: entities.length,
      yieldRate: withDomains.length ? Number((entities.length / withDomains.length).toFixed(4)) : 0,
      elapsedMs,
      concurrency,
      cacheHits,
      since,
      fetchedAt,
    },
  }
}

/** Human-readable line for Discover UI — honest weak signal, not WHOIS rush. */
export function formatRegistryProvenance(row) {
  const date = row?.incorporationDate || 'recently'
  const domain = row?.domain || 'unknown'
  const province = row?.province ? ` · ${row.province}` : ''
  return `Incorporated ${date}${province} · live domain ${domain}`
}
