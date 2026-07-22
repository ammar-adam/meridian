/**
 * SEC EDGAR Form D adapter — public full-text search, no API key.
 * Polite User-Agent with contact. Cap results. Never throw — empty + error in meta.
 */

const SEC_SEARCH = 'https://efts.sec.gov/LATEST/search-index'
const USER_AGENT = 'MeridianIngest/1.0 (research; contact: meridian@example.com)'

function extractIssuerName(hit) {
  const display = hit?.display_names?.[0] || hit?._source?.display_names?.[0]
  if (display) {
    return String(display).replace(/\s*\(CIK[^)]*\)\s*$/i, '').trim()
  }
  const entity = hit?.entity_name || hit?._source?.entity_name
  if (entity) return String(entity).trim()
  return null
}

function extractAmount(hit) {
  const raw = hit?.content || hit?._source?.content || hit?.file_description || ''
  const m = String(raw).match(/\$[\d,]+(?:\.\d+)?|\boffering\s+amount[:\s]+[\d,]+/i)
  return m ? m[0].replace(/offering\s+amount[:\s]+/i, '$').trim() : null
}

/**
 * @returns {Promise<{ entities: object[], fundingHints: object[], error?: string, meta?: object }>}
 */
export async function runFormDAdapter({ limit = 25, days = 7 } = {}) {
  const cap = Math.min(Math.max(limit, 1), 40)
  try {
    const params = new URLSearchParams({
      q: '"Form D"',
      dateRange: 'custom',
      startdt: new Date(Date.now() - days * 86400000).toISOString().slice(0, 10),
      enddt: new Date().toISOString().slice(0, 10),
      forms: 'D',
      from: '0',
      size: String(cap),
    })

    const res = await fetch(`${SEC_SEARCH}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
      redirect: 'follow',
    })

    if (!res.ok) {
      return {
        entities: [],
        fundingHints: [],
        error: `SEC HTTP ${res.status}`,
        meta: { blocked: res.status === 403 || res.status === 429 },
      }
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('json')) {
      return {
        entities: [],
        fundingHints: [],
        error: 'SEC non-JSON response',
        meta: { contentType },
      }
    }

    const data = await res.json()
    const hits = data?.hits?.hits || data?.hits || []
    const list = Array.isArray(hits) ? hits.slice(0, cap) : []

    const entities = []
    const fundingHints = []

    for (const hit of list) {
      const src = hit._source || hit
      const name = extractIssuerName(src) || extractIssuerName(hit)
      if (!name || name.length < 2) continue

      const filingUrl = src.file_url
        || (src.adsh ? `https://www.sec.gov/Archives/edgar/data/${String(src.ciks?.[0] || '').replace(/^0+/, '')}/${src.adsh}` : null)
        || 'https://www.sec.gov/edgar/search/'

      const amount = extractAmount(src)
      const filedAt = src.file_date || src.period_ending || null

      entities.push({
        id: `formd_${src.adsh || src.id || name.toLowerCase().replace(/\s+/g, '_').slice(0, 40)}`,
        type: 'company',
        personName: null,
        companyName: name,
        domain: null,
        source: 'form_d',
        confidence: 'low',
        provenance: `SEC Form D${filedAt ? ` · filed ${filedAt}` : ''} · candidate — domain unknown`,
        sourceMeta: {
          kind: 'form_d',
          amount,
          filedAt,
          filingUrl,
          cik: src.ciks?.[0] || null,
        },
        discoveredAt: new Date().toISOString(),
      })

      fundingHints.push({
        name,
        kind: 'form_d',
        amount,
        eventDate: filedAt,
        sourceUrl: filingUrl,
      })
    }

    return {
      entities,
      fundingHints,
      meta: { count: entities.length, days, fetchedAt: new Date().toISOString() },
    }
  } catch (e) {
    return {
      entities: [],
      fundingHints: [],
      error: e.message,
      meta: { skippedGracefully: true },
    }
  }
}
