import { describe, it, expect } from 'vitest'
import { fitScoreForEntity, enrichmentTier, toDiscoverSeed } from '@/lib/sourcing/entity-schema'

describe('entity-schema enrichment', () => {
  it('scores fully enriched incubator highest', () => {
    expect(fitScoreForEntity({
      source: 'incubator',
      personName: 'Ali Rahbar',
      domain: 'scadable.com',
      confidence: 'high',
    })).toBe(88)
    expect(fitScoreForEntity({
      source: 'incubator',
      personName: 'Ali Rahbar',
      domain: null,
      confidence: 'medium',
    })).toBe(78)
    expect(fitScoreForEntity({
      source: 'domain_registry',
      domain: 'x.ca',
      confidence: 'low',
    })).toBe(48)
  })

  it('enrichmentTier ranks founders+domain first', () => {
    expect(enrichmentTier({ source: 'incubator', personName: 'A', domain: 'a.com' })).toBe(3)
    expect(enrichmentTier({ source: 'incubator', personName: 'A' })).toBe(2)
    expect(enrichmentTier({ source: 'domain_registry', domain: 'a.com' })).toBe(0)
  })

  it('toDiscoverSeed preserves founders and cohort description', () => {
    const seed = toDiscoverSeed({
      companyName: 'SCADABLE',
      personName: 'Ali Rahbar',
      domain: 'scadable.com',
      source: 'incubator',
      confidence: 'high',
      provenance: 'Velocity May 2026 cohort (2026-05-01)',
      sourceMeta: {
        description: 'Supply-chain AI for manufacturers',
        geography: 'Canada · Waterloo',
        sector: 'AI / supply chain',
        stage: 'pre-seed',
      },
    })
    expect(seed.fitScore).toBe(88)
    expect(seed.personName).toBe('Ali Rahbar')
    expect(seed.description).toContain('Supply-chain')
    expect(seed.provenance).toContain('Velocity')
  })
})
