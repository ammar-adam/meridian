import { describe, it, expect } from 'vitest'
import { runIncubatorAdapter } from '../../lib/sourcing/incubator-adapter.js'
import { TIER1_SCHOOLS } from '../../lib/schools/registry.js'
import {
  localEcosystemCompanies,
  hayMatchesSchoolToken,
  geographyCompatibleWithSchool,
} from '../../lib/server/school-scout.js'

describe('school scout local seeds', () => {
  it('Waterloo matches Velocity incubator companies', () => {
    const school = TIER1_SCHOOLS.find(s => s.id === 'waterloo')
    const hits = localEcosystemCompanies(school)
    expect(hits.length).toBeGreaterThanOrEqual(5)
    expect(hits.some(h => h.companyName === 'SCADABLE')).toBe(true)
    expect(hits.every(h => String(h.sourceMeta?.geography || '').includes('Canada'))).toBe(true)
  })

  it('Toronto matches DMZ / CDL Toronto geography', () => {
    const school = TIER1_SCHOOLS.find(s => s.id === 'utoronto')
    const hits = localEcosystemCompanies(school)
    expect(hits.length).toBeGreaterThanOrEqual(5)
    expect(hits.every(h => /toronto/i.test(h.sourceMeta?.geography || h.sourceMeta?.cohortName || ''))).toBe(true)
  })

  it('does not false-match Berkeley Cal → Calgary', () => {
    expect(hayMatchesSchoolToken('canada · calgary, ab', 'cal')).toBe(false)
    expect(hayMatchesSchoolToken('berkeley · cal', 'cal')).toBe(true)
    const school = TIER1_SCHOOLS.find(s => s.id === 'berkeley')
    const hits = localEcosystemCompanies(school)
    expect(hits.some(h => /calgary/i.test(h.sourceMeta?.geography || ''))).toBe(false)
  })

  it('does not false-match Cambridge UK → Cambridge ON', () => {
    expect(geographyCompatibleWithSchool(
      { country: 'UK' },
      'Canada · Cambridge, ON',
    )).toBe(false)
    const school = TIER1_SCHOOLS.find(s => s.id === 'cambridge')
    const hits = localEcosystemCompanies(school)
    expect(hits.some(h => /canada/i.test(h.sourceMeta?.geography || ''))).toBe(false)
  })

  it('adapter still has Waterloo + Toronto seed rows', () => {
    const all = runIncubatorAdapter()
    expect(all.some(e => /waterloo/i.test(e.sourceMeta?.geography || ''))).toBe(true)
    expect(all.some(e => /toronto/i.test(e.sourceMeta?.geography || ''))).toBe(true)
  })
})
