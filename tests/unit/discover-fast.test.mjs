import { describe, it, expect } from 'vitest'
import { buildIncubatorFastDiscover, wantsIncubatorFastPath } from '@/lib/discover-fast'

describe('discover-fast', () => {
  it('detects Canadian / community theses', () => {
    expect(wantsIncubatorFastPath('Canadian pre-seed AI', { mandate: { geographies: ['US'] } })).toBe(true)
    expect(wantsIncubatorFastPath('Series A fintech', {
      mandate: { geographies: ['Canada'] },
    })).toBe(true)
    expect(wantsIncubatorFastPath('US Series B SaaS', {
      mandate: { geographies: ['United States'] },
    })).toBe(false)
  })

  it('returns enriched incubator rows sync with founders and domains', () => {
    const { companies, meta } = buildIncubatorFastDiscover(
      'Canadian pre-seed from Velocity',
      { id: 'panache_ventures', fundName: 'Panache' },
    )
    expect(meta.incubatorFastPath).toBe(true)
    expect(meta.partial).toBe(true)
    expect(companies.length).toBeGreaterThanOrEqual(8)
    expect(companies.every(c => c.source === 'incubator' && c.personName && c.domain)).toBe(true)
    expect(companies.some(c => /scadable/i.test(c.name))).toBe(true)
  })
})
