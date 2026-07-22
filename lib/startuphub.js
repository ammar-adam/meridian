import { isCanadianMandate } from '@/lib/geography-utils'

/**
 * StartupHub.ai startup search — New AI startups feed (1 credit/run).
 * https://www.startuphub.ai/api/v1/startups
 * Returns [] if not configured — Perplexity still runs.
 */

const API_BASE = process.env.STARTUPHUB_API_BASE || 'https://www.startuphub.ai/api/v1'

export function isStartupHubConfigured() {
  const key = process.env.STARTUPHUB_API_KEY
  return Boolean(key?.trim() && key !== 'your_key_here')
}

export function buildStartupHubQuery(parsed, thesis) {
  const sectors = parsed?.sectors?.slice(0, 2)?.join(' ') || ''
  const keywords = parsed?.keywords?.slice(0, 4)?.join(' ') || ''
  const stages = parsed?.stages?.slice(0, 2)?.join(' ') || ''
  const pitchbookQuery = (parsed?.pitchbookQuery || '').trim()

  const primary = [pitchbookQuery, sectors, keywords, stages]
    .filter(Boolean)
    .join(' ')
    .trim()
    .slice(0, 120)

  if (primary.length >= 8) return primary

  const fallback = [sectors, keywords, stages, thesis?.split(/[,.]/)[0]?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim()
    .slice(0, 120)

  return fallback || 'AI startup'
}

/** Ordered queries — try until we have enough candidates */
export function buildStartupHubQueries(parsed, thesis, fundContext = null) {
  const sectors = parsed?.sectors?.slice(0, 2)?.join(' ') || ''
  const keywords = parsed?.keywords?.slice(0, 5)?.join(' ') || ''
  const stages = parsed?.stages?.slice(0, 2)?.join(' ') || ''
  const pitchbookQuery = (parsed?.pitchbookQuery || '').trim()
  const canada = isCanadianMandate(parsed?.geographies, fundContext)

  const queries = [
    [pitchbookQuery, sectors, keywords].filter(Boolean).join(' ').trim(),
    [sectors, keywords, stages].filter(Boolean).join(' ').trim(),
    [keywords, stages].filter(Boolean).join(' ').trim(),
    sectors || keywords || thesis?.slice(0, 80)?.trim(),
    canada ? 'Canadian startup Toronto Montreal Vancouver' : null,
    canada ? [sectors, 'Canada', stages].filter(Boolean).join(' ').trim() : null,
    'AI infrastructure startup',
  ]
    .filter(Boolean)
    .map(q => q.slice(0, 120))
    .filter((q, i, arr) => q && q.length >= 3 && arr.indexOf(q) === i)

  return queries.length ? queries : ['AI startup']
}

/** Lightweight auth check for /api/health */
export async function verifyStartupHub() {
  if (!isStartupHubConfigured()) {
    return { configured: false, ok: false }
  }

  try {
    const params = new URLSearchParams({ q: 'AI', limit: '1', sort: '-created_at' })
    const res = await fetch(`${API_BASE}/startups?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.STARTUPHUB_API_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })
    return { configured: true, ok: res.ok, status: res.status }
  } catch (e) {
    console.error('[startuphub] verify error:', e.message)
    return { configured: true, ok: false }
  }
}

export async function searchStartupHub(parsed, thesis, fundContext = null) {
  if (!isStartupHubConfigured()) {
    console.log('[startuphub] API key not configured, skipping')
    return []
  }

  const queries = buildStartupHubQueries(parsed, thesis, fundContext)
  const limit = Number(process.env.STARTUPHUB_SEARCH_LIMIT || '25')
  const seen = new Map()

  for (const q of queries) {
    const batch = await fetchStartupHubQuery(q, limit)
    for (const company of batch) {
      const key = (company.domain || company.name || '').toLowerCase()
      if (!key || seen.has(key)) continue
      seen.set(key, company)
    }
    if (seen.size >= 12) break
  }

  const results = [...seen.values()]
  console.log('[startuphub]', queries[0]?.slice(0, 40), `→ ${results.length} companies (${queries.length} queries)`)
  return results
}

async function fetchStartupHubQuery(q, limit) {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    sort: '-created_at',
  })

  try {
    const res = await fetch(`${API_BASE}/startups?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.STARTUPHUB_API_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[startuphub] search failed:', res.status, q.slice(0, 40), err.slice(0, 120))
      return []
    }

    const data = await res.json()
    const items = data.data ?? data.results ?? []
    return items.map(normalizeStartupHubCompany).filter(Boolean)
  } catch (e) {
    console.error('[startuphub] error:', e.message)
    return []
  }
}

function normalizeStartupHubCompany(item) {
  const name = item.name
  if (!name) return null

  if (item.operating_status === 'Inactive' || item.website_status === 'dead') {
    return null
  }

  const rawWebsite = item.website ?? item.domain ?? ''
  const domain = rawWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
  const url = domain ? (rawWebsite.startsWith('http') ? rawWebsite : `https://${domain}`) : ''

  const sector = Array.isArray(item.sectors)
    ? item.sectors.slice(0, 2).join(', ')
    : (item.sector ?? '')

  const geography = [item.hq_city, item.hq_country].filter(Boolean).join(', ')

  return {
    name,
    description: item.one_liner ?? item.description ?? '',
    stage: item.stage ?? item.latest_round ?? 'Undisclosed',
    geography,
    sector,
    domain,
    url,
    totalRaised: item.total_funding ?? item.totalRaised ?? '',
    investors: item.investors ?? '',
    source: 'startuphub',
    foundedYear: item.founded_date ? item.founded_date.slice(0, 4) : null,
    score: item.total_score ?? null,
  }
}

/** Falsifiable name match — same rule as the index-check cron / sweep. */
export function nameHit(hay, companyName) {
  const h = String(hay || '').toLowerCase()
  const n = String(companyName || '').toLowerCase()
  if (!n) return false
  if (h.includes(n)) return true
  const compact = n.replace(/[^a-z0-9]/g, '')
  return compact.length >= 4 && h.replace(/[^a-z0-9]/g, '').includes(compact)
}

/**
 * Single-name StartupHub search for index-check sweeps.
 * @returns {{ present: boolean, detail: string, items: object[] }}
 */
export async function checkStartupHubByName(name) {
  if (!isStartupHubConfigured()) {
    return { present: null, detail: 'STARTUPHUB_API_KEY not configured', items: [] }
  }
  const params = new URLSearchParams({ q: name, limit: '10', sort: '-created_at' })
  const res = await fetch(`${API_BASE}/startups?${params}`, {
    headers: {
      Authorization: `Bearer ${process.env.STARTUPHUB_API_KEY}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`startuphub ${res.status}`)
  const data = await res.json()
  const items = data.data ?? data.results ?? []
  const hit = items.find(item => nameHit(item.name, name) || nameHit(name, item.name))
  return {
    present: Boolean(hit),
    detail: hit
      ? `Name match: ${hit.name}`
      : `Name search returned ${items.length} results, no match`,
    items,
  }
}
