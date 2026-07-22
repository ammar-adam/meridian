import { isStartupHubConfigured } from '@/lib/startuphub'
import { recordSighting } from '@/lib/server/company-records'
import { recordObservations } from '@/lib/server/truth-ledger'

const API_BASE = process.env.STARTUPHUB_API_BASE || 'https://www.startuphub.ai/api/v1'

/** Diverse queries for bulk corpus fill — sectors × stages × geographies. */
export const STARTUPHUB_BULK_QUERIES = [
  'AI startup pre-seed',
  'AI startup seed',
  'machine learning startup',
  'generative AI company',
  'enterprise software startup',
  'SaaS startup seed',
  'fintech startup pre-seed',
  'payments startup',
  'healthtech startup',
  'digital health startup',
  'biotech startup seed',
  'climate tech startup',
  'cleantech startup',
  'robotics startup',
  'devtools startup',
  'cybersecurity startup',
  'marketplace startup seed',
  'B2B startup Series A',
  'Canadian startup Toronto',
  'Canadian startup Montreal',
  'Canadian startup Vancouver',
  'Canadian startup Waterloo',
  'Canadian AI startup',
  'Canadian fintech',
  'US startup Austin',
  'US startup New York',
  'US startup San Francisco',
  'US startup Boston',
  'US startup Miami',
  'US startup Chicago',
  'US startup Denver',
  'US startup Seattle',
  'US secondary market startup',
  'Midwest startup',
  'Texas startup',
  'LATAM startup',
  'Mexico startup',
  'Brazil startup',
  'Colombia startup',
  'Chile startup',
  'Argentina startup',
  'Africa startup',
  'Nigeria startup',
  'Kenya startup',
  'South Africa startup',
  'Egypt startup',
  'immigrant founder startup',
  'women founders startup',
  'deep tech startup',
  'hardware startup',
  'semiconductor startup',
  'quantum computing startup',
  'blockchain startup',
  'web3 startup',
  'edtech startup',
  'proptech startup',
  'legaltech startup',
  'insurtech startup',
  'logistics startup',
  'supply chain startup',
  'agtech startup',
  'foodtech startup',
  'gaming startup',
  'media startup',
  'creator economy startup',
  'defense tech startup',
  'space startup',
  'energy startup',
  'battery startup',
  'HR tech startup',
  'sales tech startup',
  'data infrastructure startup',
  'open source startup',
  'API startup',
  'vertical SaaS startup',
  'healthcare AI startup',
  'autonomous vehicles startup',
  'construction tech startup',
  'manufacturing startup',
  'IoT startup',
  'telecom startup',
  '5G startup',
  'voice AI startup',
  'agentic AI startup',
  'LLM startup',
  'computer vision startup',
  'NLP startup',
  'synthetic biology startup',
  'medtech device startup',
  'pharma startup',
  'wellness startup',
  'mental health startup',
  'dental startup',
  'veterinary startup',
  'pet tech startup',
  'travel startup',
  'hospitality startup',
  'real estate startup',
  'mortgage startup',
  'lending startup',
  'credit startup',
  'banking startup',
  'wealthtech startup',
  'regtech startup',
  'compliance startup',
  'identity startup',
  'privacy startup',
  'security startup seed',
  'cloud startup',
  'edge computing startup',
  'serverless startup',
  'database startup',
  'analytics startup',
  'business intelligence startup',
  'customer support startup',
  'marketing tech startup',
  'advertising startup',
  'ecommerce startup',
  'retail tech startup',
  'fashion tech startup',
  'beauty startup',
  'sports startup',
  'fitness startup',
  'mobility startup',
  'EV startup',
  'charging startup',
  'micro mobility startup',
  'delivery startup',
  'warehouse startup',
  'freight startup',
  'maritime startup',
  'aviation startup',
  'drone startup',
  'satellite startup',
  'geospatial startup',
  'mapping startup',
  'GIS startup',
  'smart city startup',
  'govtech startup',
  'civic tech startup',
  'nonprofit tech startup',
  'education platform startup',
  'language learning startup',
  'coding bootcamp startup',
  'recruiting startup',
  'talent marketplace startup',
  'freelance platform startup',
  'contractor startup',
  'construction marketplace startup',
  'trades startup',
  'home services startup',
  'cleaning startup',
  'childcare startup',
  'eldercare startup',
  'disability tech startup',
  'accessibility startup',
  'translation startup',
  'localization startup',
  'content startup',
  'publishing startup',
  'news startup',
  'podcast startup',
  'video startup',
  'streaming startup',
  'music startup',
  'art startup',
  'NFT startup',
  'metaverse startup',
  'VR startup',
  'AR startup',
  '3D printing startup',
  'materials science startup',
  'nanotech startup',
  'chemical startup',
  'industrial startup',
  'mining tech startup',
  'oil gas tech startup',
  'water startup',
  'waste startup',
  'recycling startup',
  'carbon startup',
  'ESG startup',
  'impact startup',
  'social enterprise startup',
  'microfinance startup',
  'emerging markets startup',
  'Southeast Asia startup',
  'India startup',
  'Pakistan startup',
  'Indonesia startup',
  'Philippines startup',
  'Vietnam startup',
  'Singapore startup',
  'Australia startup',
  'UK startup London',
  'Europe startup Berlin',
  'France startup Paris',
  'Germany startup',
  'Netherlands startup',
  'Israel startup',
  'UAE startup Dubai',
  'Saudi startup',
  'Turkey startup',
  'Poland startup',
  'Ukraine startup',
  'Spain startup',
  'Italy startup',
  'Sweden startup',
  'Norway startup',
  'Finland startup',
  'Denmark startup',
  'Ireland startup',
  'Scotland startup',
  'Wales startup',
  'Portugal startup',
  'Greece startup',
  'Czech startup',
  'Romania startup',
  'Hungary startup',
  'Serbia startup',
  'Croatia startup',
  'Bulgaria startup',
  'Estonia startup',
  'Lithuania startup',
  'Latvia startup',
  'Slovakia startup',
  'Slovenia startup',
  'Austria startup',
  'Switzerland startup',
  'Belgium startup',
  'Luxembourg startup',
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
          provenance: `StartupHub · ${q}`,
          geography: c.geography,
          stage: c.stage,
          sectors: c.sector ? [c.sector] : null,
          oneLiner: c.description || null,
          raw: { query: q, source: 'startuphub_bulk' },
        })
        if (result?.sightingId) newSightings += 1
        if (result?.companyId) {
          await recordObservations([{
            name: c.name,
            domain: c.domain,
            source: 'startuphub',
            provenance: `StartupHub · ${q}`,
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
