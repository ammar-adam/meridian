/**
 * Source-type labels for Flow — honest taxonomy aligned with coverage-proof.
 */

export const SOURCE_TYPE_LABELS = {
  incubator: 'Incubator cohort',
  grant: 'Grant recipient',
  event_host: 'Event host',
  domain_registry: 'Registry signal',
  stealth_signal: 'Stealth signal',
  evertrace: 'Stealth signal',
  canadian_web: 'Canada web',
  scout: 'Scout (AI, unverified)',
  record: 'Company record',
  form_d: 'Form D filing',
  product_hunt: 'Product Hunt',
  sedar: 'SEDAR filing',
}

export const COMMUNITY_SOURCES = new Set([
  'incubator',
  'grant',
  'event_host',
])

export const LOW_CONFIDENCE_SOURCES = new Set([
  'domain_registry',
  'stealth_signal',
  'evertrace',
  'scout',
])

/** Human label for a source string. */
export function sourceTypeLabel(source) {
  if (!source) return 'Unknown'
  return SOURCE_TYPE_LABELS[source] || String(source).replace(/_/g, ' ')
}

/** Whether this source counts as community-sourced in Flow filters. */
export function isCommunitySourceType(source) {
  return COMMUNITY_SOURCES.has(source)
}

/** Whether company row is community-sourced (source or coverage status). */
export function isCommunityCompany(company) {
  const source = company?.source || ''
  if (isCommunitySourceType(source)) return true
  const status = company?.coverage?.status
  return status === 'community_first'
    || status === 'community_sourced'
    || Boolean(company?.notInHarmonicLikely)
}

export const FLOW_SOURCE_FILTERS = [
  { id: 'all', label: 'All sources' },
  { id: 'community', label: 'Community only' },
]

/** Filter companies by source filter id. */
export function filterBySourceType(companies, filterId = 'all') {
  const list = companies || []
  if (filterId === 'community') {
    return list.filter(isCommunityCompany)
  }
  return list
}
