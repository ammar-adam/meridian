import { extractDomain } from '@/lib/url-utils'

/**
 * @typedef {Object} SourcedEntity
 * @property {string} id
 * @property {'person'|'company'|'linked'} type
 * @property {string|null} personName
 * @property {string|null} companyName
 * @property {string|null} domain
 * @property {'domain_registry'|'incubator'|'grant'|'event_host'} source
 * @property {'low'|'medium'|'high'} confidence
 * @property {string} provenance
 * @property {Object} sourceMeta
 * @property {string} discoveredAt
 */

const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 }

export function entityId(prefix, ...parts) {
  const slug = parts
    .filter(Boolean)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80)
  return `${prefix}_${slug || 'unknown'}`
}

export function confidenceRank(level) {
  return CONFIDENCE_RANK[level] || 0
}

/**
 * Fit prior for Discover merge/rank. Fully enriched incubator rows (founders + domain)
 * sit above thin cohort names and low-confidence registry noise.
 */
export function fitScoreForEntity(entity) {
  const hasFounders = Boolean(entity?.personName)
  const hasDomain = Boolean(entity?.domain)
  if (entity?.source === 'incubator') {
    if (hasFounders && hasDomain) return 88
    if (hasFounders) return 78
    return 70
  }
  if (entity?.source === 'grant') {
    return entity.confidence === 'high' ? 68 : entity.confidence === 'medium' ? 58 : 52
  }
  if (entity?.source === 'event_host') {
    return entity.confidence === 'high' ? 62 : 54
  }
  if (entity?.source === 'domain_registry') return 48
  return entity?.confidence === 'high' ? 68 : entity?.confidence === 'medium' ? 58 : 48
}

/** 3 = founders+domain incubator, 2 = founders-only incubator, 1 = other community, 0 = weak */
export function enrichmentTier(seedOrEntity) {
  const source = seedOrEntity?.source
  const founders = Boolean(seedOrEntity?.personName)
  const domain = Boolean(seedOrEntity?.domain)
  if (source === 'incubator') {
    if (founders && domain) return 3
    if (founders) return 2
    return 1
  }
  if (source === 'grant' || source === 'event_host') return 1
  return 0
}

/** Map a SourcedEntity into Discover's CompanySeed shape */
export function toDiscoverSeed(entity) {
  if (!entity?.companyName && !entity?.personName) return null

  const domain = entity.domain ? extractDomain(entity.domain) : ''
  const name = entity.companyName || entity.personName
  const oneLiner = entity.sourceMeta?.description || ''
  const founderBit = entity.personName && entity.companyName
    ? `${entity.personName}`
    : ''
  const description = oneLiner
    || (founderBit ? `${founderBit} · ${entity.provenance || entity.companyName}` : '')
    || entity.provenance
    || entity.companyName
    || entity.personName

  return {
    name,
    description,
    stage: entity.sourceMeta?.stage || 'pre-seed',
    geography: entity.sourceMeta?.geography || entity.sourceMeta?.province || 'Canada',
    sector: entity.sourceMeta?.sector || '',
    domain,
    url: domain ? `https://${domain}` : '',
    totalRaised: entity.sourceMeta?.grantAmount || 'Undisclosed',
    investors: entity.source === 'grant' ? (entity.sourceMeta?.grantProgram || 'IRAP') : '',
    source: entity.source,
    unverified: entity.confidence === 'low',
    signalType: entity.type,
    provenance: entity.provenance,
    sourceConfidence: entity.confidence,
    personName: entity.personName || null,
    cohortDate: entity.sourceMeta?.cohortDate || null,
    fitScore: fitScoreForEntity(entity),
    rationale: entity.provenance,
  }
}

export function entitiesToDiscoverSeeds(entities = []) {
  return entities.map(toDiscoverSeed).filter(Boolean)
}
