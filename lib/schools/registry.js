/**
 * School registry — Tier-1 + emerging ecosystems in CA / US / UK.
 * Agents (infra) scout these; product pitch is school↔mandate with receipts.
 */

import sourceSeeds from '@/lib/sourcing/source-seeds.json'

/** Seeded Tier-1 schools — expand via emerging discovery + source linking. */
export const TIER1_SCHOOLS = [
  { id: 'waterloo', name: 'University of Waterloo', country: 'CA', aliases: ['Waterloo', 'UW'], tier: 'tier1' },
  { id: 'utoronto', name: 'University of Toronto', country: 'CA', aliases: ['U of T', 'UofT', 'Toronto'], tier: 'tier1' },
  { id: 'mcgill', name: 'McGill University', country: 'CA', aliases: ['McGill'], tier: 'tier1' },
  { id: 'ubc', name: 'University of British Columbia', country: 'CA', aliases: ['UBC'], tier: 'tier1' },
  { id: 'queens', name: "Queen's University", country: 'CA', aliases: ["Queen's", 'Queens'], tier: 'tier1' },
  { id: 'cmu', name: 'Carnegie Mellon University', country: 'US', aliases: ['CMU', 'Carnegie Mellon'], tier: 'tier1' },
  { id: 'stanford', name: 'Stanford University', country: 'US', aliases: ['Stanford'], tier: 'tier1' },
  { id: 'mit', name: 'Massachusetts Institute of Technology', country: 'US', aliases: ['MIT'], tier: 'tier1' },
  { id: 'berkeley', name: 'UC Berkeley', country: 'US', aliases: ['Berkeley', 'Cal'], tier: 'tier1' },
  { id: 'harvard', name: 'Harvard University', country: 'US', aliases: ['Harvard'], tier: 'tier1' },
  { id: 'oxford', name: 'University of Oxford', country: 'UK', aliases: ['Oxford'], tier: 'tier1' },
  { id: 'cambridge', name: 'University of Cambridge', country: 'UK', aliases: ['Cambridge'], tier: 'tier1' },
  { id: 'imperial', name: 'Imperial College London', country: 'UK', aliases: ['Imperial'], tier: 'tier1' },
]

const EMERGING_KEY = 'meridian_emerging_schools'

function matchTokens(school) {
  return [school.name, ...(school.aliases || [])].map(t => t.toLowerCase())
}

/** Link university-type source seeds to a school by label/url match. */
export function sourcesForSchool(school) {
  const tokens = matchTokens(school)
  return (sourceSeeds || []).filter(s => {
    if (s.type !== 'university' && s.type !== 'incubator' && s.type !== 'accelerator') return false
    const hay = `${s.label || ''} ${s.url || ''} ${s.geography || ''}`.toLowerCase()
    return tokens.some(t => t.length > 2 && hay.includes(t))
  })
}

function loadEmerging() {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(EMERGING_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveEmergingSchool(school) {
  if (typeof localStorage === 'undefined') return school
  const list = loadEmerging().filter(s => s.id !== school.id)
  list.push({ ...school, tier: 'emerging', promotedAt: new Date().toISOString() })
  localStorage.setItem(EMERGING_KEY, JSON.stringify(list))
  return school
}

export function listSchools({ country, tier } = {}) {
  const emerging = typeof localStorage !== 'undefined' ? loadEmerging() : []
  let all = [
    ...TIER1_SCHOOLS.map(s => ({ ...s, sourceCount: sourcesForSchool(s).length })),
    ...emerging.map(s => ({ ...s, sourceCount: sourcesForSchool(s).length })),
  ]
  if (country) all = all.filter(s => s.country === country)
  if (tier) all = all.filter(s => s.tier === tier)
  return all
}

export function getSchool(id) {
  return listSchools().find(s => s.id === id) || null
}

export function schoolCoverageSummary() {
  const schools = listSchools()
  const byCountry = { CA: 0, US: 0, UK: 0 }
  let tier1 = 0
  let emerging = 0
  let withSources = 0
  for (const s of schools) {
    if (byCountry[s.country] != null) byCountry[s.country] += 1
    if (s.tier === 'emerging') emerging += 1
    else tier1 += 1
    if ((s.sourceCount || 0) > 0) withSources += 1
  }
  return {
    total: schools.length,
    tier1,
    emerging,
    withSources,
    byCountry,
    universitySources: (sourceSeeds || []).filter(s => s.type === 'university').length,
  }
}

/** Server-safe list (no localStorage emerging). */
export function listSchoolsServer({ country, tier } = {}) {
  let all = TIER1_SCHOOLS.map(s => ({
    ...s,
    sources: sourcesForSchool(s).map(x => ({ id: x.id, label: x.label, url: x.url })),
    sourceCount: sourcesForSchool(s).length,
  }))
  if (country) all = all.filter(s => s.country === country)
  if (tier) all = all.filter(s => s.tier === tier)
  return all
}
