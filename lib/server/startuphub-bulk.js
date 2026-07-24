import { isStartupHubConfigured } from '@/lib/startuphub'
import { recordSighting } from '@/lib/server/company-records'
import { recordObservations } from '@/lib/server/truth-ledger'

const API_BASE = process.env.STARTUPHUB_API_BASE || 'https://www.startuphub.ai/api/v1'

/**
 * School-ecosystem queries for corpus fill — campus incubators, Tier-1 + emerging
 * university spinouts, matched to fund-mandate geographies (CA / US / UK).
 * Agents are infrastructure; product pitch is school→mandate with dated provenance.
 */
export const STARTUPHUB_BULK_QUERIES = [
  // Tier-1 Canada
  'University of Waterloo startup',
  'Waterloo Velocity incubator startup',
  'University of Toronto startup',
  'UofT entrepreneurship startup',
  'McGill University startup Montreal',
  'UBC startup Vancouver',
  "Queen's University startup Kingston",
  'Canadian university startup pre-seed',
  'Canadian campus incubator startup',
  'Toronto university spinout',
  'Montreal university startup',
  'Vancouver university startup',
  // Tier-1 US
  'Stanford University startup',
  'MIT startup Cambridge',
  'Carnegie Mellon startup Pittsburgh',
  'UC Berkeley startup',
  'Harvard University startup',
  'university spinout United States seed',
  'campus incubator startup US pre-seed',
  'college entrepreneurship startup US',
  // Tier-1 UK
  'Oxford University startup',
  'Cambridge University startup',
  'Imperial College London startup',
  'UK university spinout seed',
  'London university startup pre-seed',
  // Incubators / accelerators (school-adjacent)
  'Velocity incubator Waterloo startup',
  'DMZ Ryerson Toronto startup',
  'Creative Destruction Lab startup',
  'CDL Toronto startup',
  'CDL Montreal startup',
  'Y Combinator university founder',
  'Techstars university startup',
  'campus accelerator cohort startup',
  // Emerging / mandate-shaped sectors × school
  'AI startup university spinout Canada',
  'fintech startup university Canada',
  'healthtech startup university Waterloo',
  'deep tech university spinout',
  'climate tech university startup',
  'robotics university lab spinout',
  'devtools startup university alumni',
  'SaaS startup university founder Canada',
  'biotech university spinout seed',
  'quantum computing university startup',
  'edtech university startup',
  'cybersecurity university spinout',
  // Geography × early stage (school ecosystems)
  'Canadian startup pre-seed Waterloo',
  'Canadian startup seed Toronto',
  'Canadian startup Montreal university',
  'US startup pre-seed university',
  'UK startup seed university',
  'student founder startup Canada',
  'alumni founder startup university',
  'research lab spinout startup',
  'technology transfer office startup',
  'university incubator graduate startup',
]

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function normalizeItem(item) {
  const name = item?.name
  if (!name) return null
  if (item.operating_status === 'Inactive' || item.website_status === 'dead') return null

  const rawWebsite = item.website ?? item.domain ?? ''
  const domain = String(rawWebsite).replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
    .toLowerCase().replace(/^www\./, '')
  if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return null

  const geography = [item.hq_city, item.hq_country].filter(Boolean).join(', ')
  const sector = Array.isArray(item.sectors)
    ? item.sectors.slice(0, 3).join(' / ')
    : (item.sector ?? '')

  return {
    name: String(name).trim(),
    domain: domain || null,
    description: item.one_liner ?? item.description ?? '',
    stage: item.stage ?? item.latest_round ?? null,
    geography: geography || null,
    sector,
    url: domain ? (rawWebsite.startsWith('http') ? rawWebsite : `https://${domain}`) : null,
  }
}

async function fetchQuery(q, limit) {
  const params = new URLSearchParams({
    q: q.slice(0, 120),
    limit: String(limit),
    sort: '-created_at',
  })
  const res = await fetch(`${API_BASE}/startups?${params}`, {
    headers: {
      Authorization: `Bearer ${process.env.STARTUPHUB_API_KEY}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`startuphub ${res.status}: ${err.slice(0, 80)}`)
  }
  const data = await res.json()
  const items = data.data ?? data.results ?? []
  return items.map(normalizeItem).filter(Boolean)
}

/**
 * Bulk StartupHub ingest — one batch of queries per call (serverless-safe).
 * @returns {{ queriesRun, uniqueFetched, newSightings, errors, rateLimited }}
 */
export async function runStartupHubBulk({
  offset = 0,
  queryBatch = 25,
  perQueryLimit = 100,
  delayMs = 350,
} = {}) {
  if (!isStartupHubConfigured()) {
    return { enabled: false, reason: 'STARTUPHUB_API_KEY not configured' }
  }

  const queries = STARTUPHUB_BULK_QUERIES.slice(offset, offset + queryBatch)
  if (!queries.length) {
    return { enabled: true, done: true, reason: 'all queries processed', totalQueries: STARTUPHUB_BULK_QUERIES.length }
  }

  const seen = new Set()
  let queriesRun = 0
  let uniqueFetched = 0
  let newSightings = 0
  let rateLimited = false
  const errors = []

  for (const q of queries) {
    queriesRun += 1
    try {
      const batch = await fetchQuery(q, perQueryLimit)
      for (const c of batch) {
        const key = (c.domain || c.name).toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        uniqueFetched += 1

        const result = await recordSighting({
          name: c.name,
          domain: c.domain || undefined,
          sourceType: 'startuphub',
          sourceId: 'bulk',
          url: c.url,
          provenance: `StartupHub · school ecosystem · ${q}`,
          geography: c.geography,
          stage: c.stage,
          sectors: c.sector ? [c.sector] : null,
          oneLiner: c.description || null,
          raw: { query: q, source: 'startuphub_bulk', thesis: 'school_ecosystem' },
        })
        if (result?.sightingId) newSightings += 1
        if (result?.companyId) {
          await recordObservations([{
            name: c.name,
            domain: c.domain,
            source: 'startuphub',
            provenance: `StartupHub · school ecosystem · ${q}`,
          }])
        }
      }
    } catch (e) {
      errors.push({ query: q, error: e.message })
      if (/429|rate/i.test(e.message)) {
        rateLimited = true
        break
      }
    }
    if (delayMs > 0) await sleep(delayMs)
  }

  return {
    enabled: true,
    offset,
    nextOffset: offset + queriesRun,
    totalQueries: STARTUPHUB_BULK_QUERIES.length,
    done: offset + queriesRun >= STARTUPHUB_BULK_QUERIES.length,
    queriesRun,
    uniqueFetched,
    newSightings,
    rateLimited,
    errors: errors.slice(0, 10),
  }
}
