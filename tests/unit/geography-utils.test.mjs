import { describe, it, expect } from 'vitest'
import {
  isCanadianMandate,
  isCanadaOnlyMandate,
  looksCanadian,
  looksUsOnly,
  filterSeedsForMandate,
} from '@/lib/geography-utils'

describe('geography-utils', () => {
  it('detects Canadian mandate from fund context', () => {
    expect(isCanadianMandate([], { mandate: { geographies: ['Canada'] } })).toBe(true)
    expect(isCanadianMandate(['North America'], { mandate: { geographies: ['US'] } })).toBe(false)
  })

  it('identifies Canadian companies by geography and .ca domain', () => {
    expect(looksCanadian({ geography: 'Toronto, Canada', domain: 'acme.com' })).toBe(true)
    expect(looksCanadian({ domain: 'startup.ca' })).toBe(true)
    expect(looksUsOnly({ geography: 'San Francisco, US' })).toBe(true)
  })

  it('filters US-only seeds when mandate is Canada-only', () => {
    const seeds = [
      { name: 'A', geography: 'Toronto, Canada' },
      { name: 'B', geography: 'San Francisco, US' },
      { name: 'C', geography: '' },
    ]
    const out = filterSeedsForMandate(seeds, ['Canada'], { mandate: { geographies: ['Canada'] } })
    expect(out.map(s => s.name)).toEqual(['A', 'C'])
    expect(isCanadaOnlyMandate(['Canada'], null)).toBe(true)
  })
})
