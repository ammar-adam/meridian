import { isCanadaOnlyMandate, isCanadianMandate, looksCanadian, looksUsOnly, normalizeGeographies } from '@/lib/geography-utils'

/**
 * Mandate matching (docs/build-plan-slices.md Slice D).
 *
 * Hard filters (geo/stage) + scored sector/keyword overlap with renderable
 * matchReasons. Never invents a bare fitScore that can't be explained.
 * Pure functions — unit-testable without DB.
 */

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'from', 'with',
  'at', 'by', 'is', 'are', 'be', 'as', 'that', 'this', 'these', 'those', 'into',
  'pre', 'seed', 'series', 'stage', 'focus', 'looking', 'want', 'companies',
  'startups', 'founders', 'founder', 'invest', 'investing', 'mandate', 'thesis',
])

const STAGE_ALIASES = {
  'pre-seed': ['pre-seed', 'preseed', 'pre seed'],
  seed: ['seed'],
  'series-a': ['series a', 'series-a', 'seriesa', 'a round'],
  'series-b': ['series b', 'series-b', 'seriesb', 'growth'],
}

/** Tokenize thesis/mandate text into searchable keywords. */
export function tokenizeMandate(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9+./\s-]/g, ' ')
    .split(/[\s,/|]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !STOP.has(t))
}

export function detectStages(text = '') {
  const hay = String(text).toLowerCase()
  const found = []
  for (const [stage, aliases] of Object.entries(STAGE_ALIASES)) {
    if (aliases.some(a => hay.includes(a))) found.push(stage)
  }
  return found
}

function companyHaystack(company) {
  return [
    company?.name,
    company?.sector,
    company?.sectors?.join?.(' '),
    Array.isArray(company?.sectors) ? company.sectors.join(' ') : '',
    company?.oneLiner || company?.one_liner,
    company?.description,
    company?.provenance,
    company?.sourceMeta?.sector,
    company?.sourceMeta?.program,
  ].filter(Boolean).join(' ').toLowerCase()
}

function companyStage(company) {
  const raw = String(company?.stage || company?.sourceMeta?.stage || '').toLowerCase()
  if (!raw) return null
  if (/pre/.test(raw)) return 'pre-seed'
  if (/seed/.test(raw) && !/series/.test(raw)) return 'seed'
  if (/series\s*a|\ba\b/.test(raw)) return 'series-a'
  if (/series\s*b|growth/.test(raw)) return 'series-b'
  return raw
}

function companyIsCanadian(company) {
  if (looksCanadian(company)) return true
  const geo = String(company?.geography || company?.sourceMeta?.geography || '').toLowerCase()
  return /canada|waterloo|toronto|montreal|vancouver|calgary|ontario|quebec|alberta|bc\b/.test(geo)
}

/**
 * Hard geography filter.
 * - Canada-only mandate → keep Canadian / unknown (unknown stays; drop clear non-Canada)
 * - Explicitly non-Canada mandate (has geo markers but none are Canada) → drop Canadian-only rows
 * - Mixed / unspecified → no hard drop
 */
export function hardFilterByGeography(companies, geographies, fundContext) {
  const geos = normalizeGeographies(geographies, fundContext)
  if (!geos.length) return { kept: companies, dropped: [], reason: null }

  if (isCanadaOnlyMandate(geos, fundContext)) {
    const kept = []
    const dropped = []
    for (const c of companies) {
      const geo = String(c?.geography || c?.sourceMeta?.geography || '')
      // Keep Canadian and geography-unknown; drop clearly non-Canadian / US-only.
      if (looksUsOnly(c) || (geo && !companyIsCanadian(c) && /latam|africa|europe|asia|mexico|brazil|nigeria|india|uk\b|united kingdom/i.test(geo))) {
        dropped.push(c)
      } else {
        kept.push(c)
      }
    }
    return { kept, dropped, reason: dropped.length ? 'outside Canada-only mandate' : null }
  }

  // Explicit non-Canada geographies in the mandate
  const wantsCanada = isCanadianMandate(geos, fundContext)
  const nonCanadaMarkers = geos.some(g =>
    /us\b|usa|united states|latam|latin|africa|europe|uk|asia|mexico|brazil|nigeria|india/i.test(g)
  )
  if (nonCanadaMarkers && !wantsCanada) {
    const kept = []
    const dropped = []
    for (const c of companies) {
      if (companyIsCanadian(c)) dropped.push(c)
      else kept.push(c)
    }
    return {
      kept,
      dropped,
      reason: dropped.length
        ? `mandate targets ${geos.slice(0, 3).join(', ')} — current corpus is mostly Canada`
        : null,
    }
  }

  return { kept: companies, dropped: [], reason: null }
}

export function hardFilterByStage(companies, stages = []) {
  if (!stages.length) return { kept: companies, dropped: [] }
  const stageSet = new Set(stages)
  const kept = []
  const dropped = []
  for (const c of companies) {
    const s = companyStage(c)
    if (!s || stageSet.has(s)) kept.push(c)
    else dropped.push(c)
  }
  return { kept, dropped }
}

/**
 * Score one company against mandate tokens. Returns { score, matchReasons }.
 * Score is 0–100 and always explainable via matchReasons.
 */
export function scoreCompany(company, { tokens = [], stages = [], thesis = '' } = {}) {
  const reasons = []
  let score = 20 // base: in the corpus at all

  const hay = companyHaystack(company)
  const hits = []
  for (const t of tokens) {
    if (t.length >= 2 && hay.includes(t)) hits.push(t)
  }
  // Prefer longer / more specific hits
  const uniqueHits = [...new Set(hits)].sort((a, b) => b.length - a.length).slice(0, 6)
  if (uniqueHits.length) {
    score += Math.min(45, uniqueHits.length * 12)
    reasons.push(`sector/keyword match: ${uniqueHits.slice(0, 3).join(', ')}`)
  }

  const cStage = companyStage(company)
  if (stages.length && cStage && stages.includes(cStage)) {
    score += 15
    reasons.push(`stage match: ${cStage}`)
  }

  if (company?.personName || (company?.founders && company.founders.length)) {
    score += 8
    reasons.push('founder identified')
  }
  if (company?.domain) {
    score += 5
    reasons.push(`live domain ${company.domain}`)
  }

  // Freshness boost from cohort date
  const cohort = company?.cohortDate || company?.sourceMeta?.cohortDate
  if (cohort) {
    const age = Math.floor((Date.now() - Date.parse(cohort)) / 86400000)
    if (!Number.isNaN(age) && age >= 0 && age <= 120) {
      score += 10
      reasons.push(`fresh cohort (${age}d)`)
    }
  }

  // Serial founder flag if present
  if (company?.serialFounder) {
    score += 12
    reasons.push('serial founder')
  }

  score = Math.max(0, Math.min(100, score))
  if (!reasons.length) {
    reasons.push(thesis ? 'in corpus — weak thesis overlap' : 'in corpus')
  }

  return { score, matchReasons: reasons }
}

/**
 * Match a company list to a mandate. Returns ranked companies with scores
 * and a coverage assessment for the UI banner.
 */
export function matchMandate(companies = [], { thesis = '', fundContext = null, parsed = null } = {}) {
  const geos = normalizeGeographies(parsed?.geographies, fundContext)
  const stageText = [thesis, ...(parsed?.stages || [])].join(' ')
  const stages = detectStages(stageText)
  const tokens = [
    ...tokenizeMandate(thesis),
    ...(parsed?.keywords || []).map(k => String(k).toLowerCase()),
    ...(parsed?.sectors || []).map(s => String(s).toLowerCase()),
  ]
  const uniqueTokens = [...new Set(tokens)]

  const geo = hardFilterByGeography(companies, geos.length ? geos : inferGeosFromThesis(thesis), fundContext)
  let geoKept = geo.kept
  let geoBannerReason = geo.reason
  let usedGeoFallback = false
  if (geoKept.length < 3 && geo.dropped.length > 0) {
    const fallback = geo.dropped
      .map(c => {
        const { score, matchReasons } = scoreCompany(c, { tokens: uniqueTokens, stages, thesis })
        return { ...c, fitScore: score, matchReasons }
      })
      .filter(c => (c.fitScore || 0) >= 35)
      .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
      .slice(0, 15)
    if (fallback.length) {
      geoKept = [...geoKept, ...fallback]
      usedGeoFallback = true
      geoBannerReason = geoBannerReason
        || `Thin ${geos.slice(0, 2).join('/')} coverage — showing closest corpus matches while sources expand`
    }
  }

  const stage = hardFilterByStage(geoKept, stages)

  const scored = stage.kept.map((c) => {
    const { score, matchReasons } = scoreCompany(c, { tokens: uniqueTokens, stages, thesis })
    return { ...c, fitScore: score, matchReasons }
  })

  scored.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))

  const total = companies.length
  const matched = scored.length
  const strong = scored.filter(c => (c.fitScore || 0) >= 50).length
  const coverageRatio = total ? matched / total : 0
  const weakThesis = uniqueTokens.length >= 2 && strong === 0 && matched > 0
  const finalCompanies = weakThesis ? scored.slice(0, 5) : scored
  const outsideCoverage = matched === 0 || weakThesis || usedGeoFallback
    || (geo.dropped.length > matched && coverageRatio < 0.25)

  return {
    companies: finalCompanies,
    meta: {
      totalCorpus: total,
      matched,
      strongMatches: strong,
      droppedGeo: geo.dropped.length,
      droppedStage: stage.dropped.length,
      coverageRatio,
      outsideCoverage,
      coverageBanner: outsideCoverage
        ? buildCoverageBanner({ geos, thesis, matched, total, dropReason: geoBannerReason || geo.reason })
        : null,
      matchTokens: uniqueTokens.slice(0, 12),
      stages,
      geographies: geos.length ? geos : inferGeosFromThesis(thesis),
      canadianMandate: isCanadianMandate(geos.length ? geos : inferGeosFromThesis(thesis), fundContext),
      usedGeoFallback,
    },
  }
}

export function inferGeosFromThesis(thesis = '') {
  const t = thesis.toLowerCase()
  const geos = []
  if (/canada|canadian|waterloo|toronto|montreal|vancouver|calgary/.test(t)) geos.push('Canada')
  if (/\busa\b|\bunited states\b|\bus secondary\b|\bsilicon valley\b|\baustin\b|\btulsa\b/.test(t)) geos.push('United States')
  if (/latam|latin america|mexico|brazil|chile|colombia/.test(t)) geos.push('LATAM')
  if (/africa|lagos|nairobi|kenya|nigeria/.test(t)) geos.push('Africa')
  if (/europe|uk|london|berlin|paris/.test(t)) geos.push('Europe')
  return geos
}

function buildCoverageBanner({ geos, thesis, matched, total, dropReason }) {
  const geoLabel = geos?.length ? geos.slice(0, 3).join(', ') : 'your stated geography'
  return {
    title: 'Mandate outside most of our current coverage',
    detail: dropReason
      || `Your thesis points at ${geoLabel}. ${matched} of ${total} companies in the current corpus match after filters.`,
    expanding: 'Coverage is expanding via university/incubator ingestion across North America and beyond. Watch this mandate — new matches will appear as sources land.',
  }
}
