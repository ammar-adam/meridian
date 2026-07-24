import { describe, it, expect } from 'vitest'
import { trustTier, compareByTrustThenFit, applyTrustFitPenalty } from '../../lib/source-trust.js'

describe('source-trust', () => {
  it('ranks dated incubator above AI university_scout', () => {
    const incubator = {
      name: 'SCADABLE',
      source: 'incubator',
      personName: 'Founder',
      domain: 'scadable.com',
      cohortDate: '2026-05-01',
      provenance: 'Velocity May 2026 cohort',
      fitScore: 70,
    }
    const scout = {
      name: 'Setori',
      source: 'university_scout',
      description: 'AI companion',
      provenance: 'School scout · AI-researched, unverified',
      unverified: true,
      fitScore: 95,
    }
    expect(trustTier(incubator)).toBeGreaterThan(trustTier(scout))
    expect(compareByTrustThenFit(incubator, scout)).toBeLessThan(0)
  })

  it('caps fitScore for unverified scout rows', () => {
    const penalized = applyTrustFitPenalty({
      source: 'university_scout',
      unverified: true,
      provenance: 'AI-researched, unverified',
      fitScore: 90,
    })
    expect(penalized.fitScore).toBeLessThanOrEqual(42)
    expect(penalized.unverified).toBe(true)
  })
})
