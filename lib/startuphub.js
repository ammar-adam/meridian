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
  const fromParsed = [
    parsed?.pitchbookQuery,
    parsed?.sectors?.slice(0, 2)?.join(' '),
    parsed?.keywords?.slice(0, 4)?.join(' '),
  ].filter(Boolean)

  return (fromParsed[0] || thesis || '').trim().slice(0, 200)
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

export async function searchStartupHub(parsed, thesis) {
  if (!isStartupHubConfigured()) {
    console.log('[startuphub] API key not configured, skipping')
    return []
  }

  const q = buildStartupHubQuery(parsed, thesis)
  const params = new URLSearchParams({
    q,
    limit: String(process.env.STARTUPHUB_SEARCH_LIMIT || '25'),
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
      console.error('[startuphub] search failed:', res.status, err)
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
