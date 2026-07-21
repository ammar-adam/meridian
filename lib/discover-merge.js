import { extractDomain } from '@/lib/url-utils'
import { enrichmentTier } from '@/lib/sourcing/entity-schema'

const MIN_RESULTS = Number(process.env.DISCOVER_MIN_RESULTS || '12')
const MAX_RESULTS = Number(process.env.DISCOVER_MAX_RESULTS || '40')
const MIN_FIT_SCORE = 35

/** Floor fitScore for enriched incubator seeds so they survive post-process filters */
const ENRICHED_INCUBATOR_FLOOR = 80
const FOUNDERS_INCUBATOR_FLOOR = 70

export function companyDedupKey(company) {
  const domain = extractDomain(company?.domain || company?.url || '')
  if (domain) return `d:${domain.toLowerCase()}`
  const name = (company?.name || '').toLowerCase().trim()
  return name ? `n:${name}` : ''
}

function normalizeDomain(domainOrUrl) {
  const domain = extractDomain(domainOrUrl || '')
  if (!domain || !domain.includes('.')) return ''
  return domain
}

function normalizeSeed(company) {
  const domain = normalizeDomain(company.domain || company.url)
  const url = company.url?.trim()
    || (domain ? `https://${domain}` : '')
  return {
    name: String(company.name || '').trim(),
    description: company.description || '',
    stage: company.stage || 'Undisclosed',
    geography: company.geography || '',
    sector: company.sector || '',
    domain,
    url,
    totalRaised: company.totalRaised || 'Undisclosed',
    investors: company.investors || '',
    source: company.source || 'startuphub',
    unverified: Boolean(company.unverified),
    signalType: company.signalType || '',
    provenance: company.provenance || '',
    sourceConfidence: company.sourceConfidence || '',
    personName: company.personName || null,
    fitScore: Number(company.fitScore) || Number(company.score) || 0,
    rationale: company.rationale || '',
  }
}

function mergeSeed(existing, incoming) {
  const a = normalizeSeed(existing)
  const b = normalizeSeed(incoming)
  const sources = new Set([a.source, b.source].filter(Boolean))
  return {
    ...a,
    description: a.description || b.description,
    stage: a.stage !== 'Undisclosed' ? a.stage : b.stage,
    geography: a.geography || b.geography,
    sector: a.sector || b.sector,
    domain: a.domain || b.domain,
    url: a.url || b.url,
    totalRaised: a.totalRaised !== 'Undisclosed' ? a.totalRaised : b.totalRaised,
    investors: a.investors || b.investors,
    source: sources.size > 1 ? 'both' : (a.source || b.source),
    unverified: a.unverified || b.unverified,
    provenance: [a.provenance, b.provenance].filter(Boolean).join(' · ') || '',
    sourceConfidence: a.sourceConfidence || b.sourceConfidence || '',
    personName: a.personName || b.personName || null,
    fitScore: Math.max(a.fitScore, b.fitScore),
    rationale: a.rationale || b.rationale,
  }
}

/** Merge StartupHub + PitchBook (+ optional lists) with domain/name dedup */
export function mergeCompanySeeds(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const raw of list || []) {
      if (!raw?.name) continue
      const seed = normalizeSeed(raw)
      if (!seed.name) continue
      const key = companyDedupKey(seed)
      if (!key) continue
      const existing = map.get(key)
      map.set(key, existing ? mergeSeed(existing, seed) : seed)
    }
  }
  return [...map.values()]
}

export function normalizeRankedCompany(company) {
  const domain = normalizeDomain(company.domain || company.url)
  const url = company.url?.trim()
    || (domain ? `https://${domain}` : '')
  return {
    ...company,
    name: String(company.name || '').trim(),
    domain,
    url,
    fitScore: Number(company.fitScore) || 0,
    description: company.description || '',
    rationale: company.rationale || '',
    stage: company.stage || 'Undisclosed',
    geography: company.geography || '',
    sector: company.sector || '',
    totalRaised: company.totalRaised || 'Undisclosed',
    investors: company.investors || '',
    source: company.source || 'perplexity',
  }
}

export function dedupeRankedCompanies(companies) {
  const map = new Map()
  for (const raw of companies || []) {
    const c = normalizeRankedCompany(raw)
    if (!c.name) continue
    const key = companyDedupKey(c)
    if (!key) continue
    const existing = map.get(key)
    if (!existing || c.fitScore > existing.fitScore) {
      map.set(key, existing ? mergeSeed(existing, c) : c)
    }
  }
  return [...map.values()]
}

function seedToRanked(seed, fitScore = 55) {
  const s = normalizeSeed(seed)
  return {
    ...s,
    fitScore: s.fitScore >= MIN_FIT_SCORE ? s.fitScore : fitScore,
    rationale: s.rationale || 'Structured database match — review fit against thesis.',
    source: s.source || 'startuphub',
  }
}

function compareDiscoverRows(a, b, { preferEnrichedIncubators = false } = {}) {
  if (preferEnrichedIncubators) {
    const tierDiff = enrichmentTier(b) - enrichmentTier(a)
    if (tierDiff !== 0) return tierDiff
  }
  return (b.fitScore || 0) - (a.fitScore || 0)
}

/** Raise floor for incubator seeds that already have founders and/or domains */
export function applyIncubatorFitFloors(companies, seeds = []) {
  const byKey = new Map()
  for (const seed of seeds || []) {
    const key = companyDedupKey(seed)
    if (key) byKey.set(key, normalizeSeed(seed))
  }

  return (companies || []).map((raw) => {
    const c = normalizeRankedCompany(raw)
    const key = companyDedupKey(c)
    const seed = (key && byKey.get(key)) || null
    const merged = seed ? mergeSeed(seed, c) : c
    if (merged.source !== 'incubator' && seed?.source !== 'incubator') return merged

    const tier = enrichmentTier(merged)
    let floor = 0
    if (tier >= 3) floor = ENRICHED_INCUBATOR_FLOOR
    else if (tier >= 2) floor = FOUNDERS_INCUBATOR_FLOOR
    if (floor && merged.fitScore < floor) {
      return {
        ...merged,
        source: 'incubator',
        fitScore: floor,
        provenance: merged.provenance || seed?.provenance || '',
        personName: merged.personName || seed?.personName || null,
        sourceConfidence: merged.sourceConfidence || seed?.sourceConfidence || 'high',
      }
    }
    return {
      ...merged,
      source: merged.source === 'incubator' || seed?.source === 'incubator' ? 'incubator' : merged.source,
      provenance: merged.provenance || seed?.provenance || '',
      personName: merged.personName || seed?.personName || null,
    }
  })
}

/** Backfill from database seeds when the ranker returns too few */
export function enforceMinimumResults(ranked, seeds, { min = MIN_RESULTS, max = MAX_RESULTS, preferEnrichedIncubators = false } = {}) {
  const out = [...ranked]
  const seen = new Set(out.map(companyDedupKey))

  const sortedSeeds = [...(seeds || [])].sort((a, b) => compareDiscoverRows(a, b, { preferEnrichedIncubators }))

  for (const seed of sortedSeeds) {
    if (out.length >= min) break
    const normalized = normalizeSeed(seed)
    if (!normalized.domain && !normalized.url && !['incubator', 'grant', 'event_host'].includes(normalized.source)) continue
    const key = companyDedupKey(normalized)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(seedToRanked(normalized))
  }

  return out.slice(0, max)
}

/** Server-side normalize, dedupe, filter, backfill, sort */
export function postProcessDiscoverResults(companies, seeds, options = {}) {
  const min = options.min ?? MIN_RESULTS
  const max = options.max ?? MAX_RESULTS
  const preferEnrichedIncubators = Boolean(options.preferEnrichedIncubators)

  let out = dedupeRankedCompanies(companies)
    .filter(c => c.domain || c.url || c.source === 'incubator' || c.source === 'grant' || c.source === 'event_host' || c.provenance)
    .filter(c => c.fitScore >= MIN_FIT_SCORE || c.source === 'startuphub' || c.source === 'pitchbook' || c.source === 'both' || c.source === 'stealth_signal' || c.source === 'evertrace' || c.source === 'incubator' || c.source === 'grant' || c.source === 'domain_registry' || c.source === 'event_host' || c.unverified)

  out = applyIncubatorFitFloors(out, seeds)

  // Canada / community-first Discover: only surface incubator rows with founders+domain
  // so the table survives a scroll without thin or inaccurate cohort stubs.
  if (preferEnrichedIncubators) {
    out = out.filter((c) => {
      if (c.source !== 'incubator') return true
      return enrichmentTier(c) >= 3
    })
    // Prefer enriched incubator seeds when backfilling the minimum set
    const enrichedSeeds = (seeds || []).filter(
      (s) => s.source !== 'incubator' || enrichmentTier(s) >= 3,
    )
    out = enforceMinimumResults(out, enrichedSeeds, { min, max, preferEnrichedIncubators })
  } else {
    out = enforceMinimumResults(out, seeds, { min, max, preferEnrichedIncubators })
  }

  out.sort((a, b) => compareDiscoverRows(a, b, { preferEnrichedIncubators }))
  return out.slice(0, max)
}

export { MIN_RESULTS, MAX_RESULTS, MIN_FIT_SCORE }
