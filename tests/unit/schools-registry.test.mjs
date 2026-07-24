import { describe, it, expect } from 'vitest'
import { TIER1_SCHOOLS, listSchoolsServer, sourcesForSchool, schoolCoverageSummary } from '../../lib/schools/registry.js'

describe('school registry', () => {
  it('seeds Tier-1 CA/US/UK schools', () => {
    expect(TIER1_SCHOOLS.length).toBeGreaterThanOrEqual(10)
    const countries = new Set(TIER1_SCHOOLS.map(s => s.country))
    expect(countries.has('CA')).toBe(true)
    expect(countries.has('US')).toBe(true)
    expect(countries.has('UK')).toBe(true)
  })

  it('links Waterloo and UofT to university sources', () => {
    const waterloo = TIER1_SCHOOLS.find(s => s.id === 'waterloo')
    const uoft = TIER1_SCHOOLS.find(s => s.id === 'utoronto')
    // Velocity / Hatchery may match geography or label tokens
    expect(sourcesForSchool(uoft).length + sourcesForSchool(waterloo).length).toBeGreaterThan(0)
  })

  it('lists schools server-side with source counts', () => {
    const list = listSchoolsServer()
    expect(list.length).toBe(TIER1_SCHOOLS.length)
    expect(schoolCoverageSummary().universitySources).toBeGreaterThan(20)
  })
})
