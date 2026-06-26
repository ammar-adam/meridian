import { getEditLog } from '@/lib/edit-tracker'
import { getDemotedSet } from '@/lib/discover-state'

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
}

function companyTokens(company) {
  const parts = [
    company.name,
    company.description,
    company.sector,
    company.stage,
    company.geography,
    company.domain,
  ]
  return new Set(tokenize(parts.filter(Boolean).join(' ')))
}

function buildPatternSets(trackingId = 'guest') {
  const log = getEditLog().filter(e => (e.trackingId ?? e.fundName) === trackingId)
  const pursued = log.filter(e => e.fieldName === '_outcome' && e.newValue === 'pursue')
  const passed = log.filter(e => e.fieldName === '_outcome' && (e.newValue === 'pass' || e.newValue === 'more_info'))

  const pursueTokens = new Map()
  const passTokens = new Map()
  const pursueSectors = new Set()
  const passSectors = new Set()

  const addTokens = (map, text) => {
    for (const t of tokenize(text)) {
      map.set(t, (map.get(t) || 0) + 1)
    }
  }

  for (const e of pursued) {
    addTokens(pursueTokens, [e.companyName, e.sector, e.stage].filter(Boolean).join(' '))
    if (e.sector) pursueSectors.add(e.sector.toLowerCase())
  }
  for (const e of passed) {
    addTokens(passTokens, [e.companyName, e.sector, e.stage].filter(Boolean).join(' '))
    if (e.sector) passSectors.add(e.sector.toLowerCase())
  }

  return { pursueTokens, passTokens, pursued, passed, pursueSectors, passSectors }
}

export function scoreBehavioralFit(company, trackingId = 'guest', thesis = '') {
  const { pursueTokens, passTokens, pursued, passed, pursueSectors, passSectors } = buildPatternSets(trackingId)
  const demoted = getDemotedSet(thesis)
  const domain = (company.domain || '').toLowerCase()

  if (domain && demoted.has(domain)) {
    return { score: -1, label: 'Demoted', reason: 'You demoted this company in Discover' }
  }

  if (!pursued.length && !passed.length) {
    return { score: 0, label: null, reason: null }
  }

  const tokens = companyTokens(company)
  let score = 0
  const reasons = []

  const sector = (company.sector || '').toLowerCase()
  const stage = (company.stage || '').toLowerCase()

  if (sector && pursueSectors.has(sector)) {
    score += 0.35
    reasons.push(`Sector matches pursued deals (${company.sector})`)
  }
  if (sector && passSectors.has(sector)) {
    score -= 0.4
    reasons.push(`Sector matches passed deals (${company.sector})`)
  }
  if (stage && passed.some(e => (e.stage || '').toLowerCase() === stage)) {
    score -= 0.15
    reasons.push(`Stage overlap with passed deals`)
  }

  for (const [t, n] of pursueTokens) {
    if (tokens.has(t)) {
      score += 0.15 * n
      reasons.push(`Similar to pursued deal (${t})`)
    }
  }
  for (const [t, n] of passTokens) {
    if (tokens.has(t)) {
      score -= 0.2 * n
      reasons.push(`Similar to passed deal (${t})`)
    }
  }

  if (score > 0.2) return { score, label: 'Lean in', reason: reasons[0] }
  if (score < -0.2) return { score, label: 'Downranked', reason: reasons[0] }
  return { score, label: 'Neutral', reason: reasons[0] || null }
}

export function applyBehavioralRank(companies, { trackingId = 'guest', thesis = '' } = {}) {
  return [...companies]
    .map(c => {
      const behavioral = scoreBehavioralFit(c, trackingId, thesis)
      const mandateScore = c.fitScore ?? 0
      const combined = mandateScore + behavioral.score * 0.4
      return { ...c, behavioral, combinedScore: combined }
    })
    .sort((a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0))
}

export function inferRevealedPreference(trackingId = 'guest') {
  const log = getEditLog().filter(e => (e.trackingId ?? e.fundName) === trackingId)
  const outcomes = log.filter(e => e.fieldName === '_outcome')
  const pursued = outcomes.filter(e => e.newValue === 'pursue').map(e => e.companyName)
  const passed = outcomes.filter(e => e.newValue === 'pass').map(e => e.companyName)

  if (!outcomes.length) return null

  const pursueRate = pursued.length / outcomes.length
  const lines = []

  if (pursued.length) {
    lines.push(`You pursued ${pursued.length} companies recently, including ${pursued.slice(0, 4).join(', ')}.`)
  }
  if (passed.length) {
    lines.push(`You passed on ${passed.length}, including ${passed.slice(0, 4).join(', ')}.`)
  }
  lines.push(`Overall pursue rate: ${Math.round(pursueRate * 100)}%.`)

  return {
    pursueRate,
    pursued,
    passed,
    summary: lines.join(' '),
  }
}
