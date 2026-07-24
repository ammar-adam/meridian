import { describe, it, expect } from 'vitest'
import { runIncubatorAdapter } from '../../lib/sourcing/incubator-adapter.js'
import { TIER1_SCHOOLS } from '../../lib/schools/registry.js'

describe('school scout local seeds', () => {
  it('Waterloo matches Velocity incubator companies', () => {
    const school = TIER1_SCHOOLS.find(s => s.id === 'waterloo')
    const tokens = [school.name, ...school.aliases].map(t => t.toLowerCase())
    const hits = runIncubatorAdapter().filter(e => {
      const meta = e.sourceMeta || {}
      const hay = `${e.companyName} ${meta.geography || ''} ${e.provenance || ''}`.toLowerCase()
      return tokens.some(t => hay.includes(t))
    })
    expect(hits.length).toBeGreaterThanOrEqual(5)
    expect(hits.some(h => h.companyName === 'SCADABLE')).toBe(true)
  })
})
