/**
 * Trust ranking for Flow / Discover — dated incubator rows beat AI-unverified school scout.
 */

const SOURCE_BASE = {
  incubator: 80,
  grant: 55,
  event_host: 50,
  brief: 60,
  startuphub: 45,
  university_source: 35,
  incubator_seed: 80,
  scout: 20,
  university_scout: 18,
  record: 30,
}

export function isAiUnverifiedProvenance(provenance = '') {
  const p = String(provenance || '').toLowerCase()
  return (
    p.includes('ai-researched')
    || p.includes('unverified')
    || p.includes('school scout')
  )
}

export function isDatedIncubatorRow(company = {}) {
  const source = String(company.source || company.latest_source || '').toLowerCase()
  if (source === 'incubator') return true
  const prov = String(company.provenance || company.latest_provenance || '')
  if (/velocity|dmz|cdl|incubator cohort/i.test(prov) && company.cohortDate) return true
  if (company.cohortDate && (company.personName || company.domain)) {
    if (/velocity|dmz|cdl|incubator/i.test(prov)) return true
  }
  return false
}

/**
 * Higher = more trustworthy for mentor-facing feeds.
 * Dated incubator / founder+domain >> AI university_scout fluff.
 */
export function trustTier(company = {}) {
  const source = String(company.source || company.latest_source || '').toLowerCase()
  const provenance = company.provenance || company.latest_provenance || ''
  const aiUnverified = company.unverified
    || company.sourceConfidence === 'low'
    || isAiUnverifiedProvenance(provenance)
    || source === 'university_scout'
    || source === 'scout'

  let score = SOURCE_BASE[source] ?? 25

  if (isDatedIncubatorRow(company)) score = Math.max(score, 85)
  if (company.cohortDate) score += 15
  if (company.personName) score += 10
  if (company.domain) score += 8
  if (aiUnverified && !isDatedIncubatorRow(company)) score -= 40
  if (/setori|ai companion|dating app/i.test(`${company.name || ''} ${company.description || ''}`)) {
    score -= 25
  }

  return score
}

/** Sort comparator: trust first, then fitScore. */
export function compareByTrustThenFit(a, b) {
  const trustDiff = trustTier(b) - trustTier(a)
  if (trustDiff !== 0) return trustDiff
  return (b.fitScore || 0) - (a.fitScore || 0)
}

/** Soft fit penalty so unverified scout cannot outrank incubators on keyword alone. */
export function applyTrustFitPenalty(company = {}) {
  const tier = trustTier(company)
  if (tier >= 70) return company
  if (tier >= 40) {
    return {
      ...company,
      fitScore: Math.min(company.fitScore || 0, Math.max(35, (company.fitScore || 0) - 8)),
    }
  }
  return {
    ...company,
    fitScore: Math.min(company.fitScore || 0, 42),
    unverified: true,
    sourceConfidence: company.sourceConfidence || 'low',
  }
}
