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

/** Map a SourcedEntity into Discover's CompanySeed shape */
export function toDiscoverSeed(entity) {
  if (!entity?.companyName && !entity?.personName) return null

  const domain = entity.domain ? extractDomain(entity.domain) : ''
  const name = entity.companyName || entity.personName
  const description = entity.provenance
    || (entity.personName && entity.companyName
      ? `${entity.personName} · ${entity.companyName}`
      : entity.companyName || entity.personName)

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
    fitScore: entity.confidence === 'high' ? 68 : entity.confidence === 'medium' ? 58 : 48,
    rationale: entity.provenance,
  }
}

export function entitiesToDiscoverSeeds(entities = []) {
  return entities.map(toDiscoverSeed).filter(Boolean)
}
