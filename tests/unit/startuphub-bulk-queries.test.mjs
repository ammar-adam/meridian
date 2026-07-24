import { describe, it, expect } from 'vitest'
import { STARTUPHUB_BULK_QUERIES } from '@/lib/server/startuphub-bulk'

describe('STARTUPHUB_BULK_QUERIES school thesis', () => {
  it('keeps a focused school-ecosystem query set', () => {
    expect(STARTUPHUB_BULK_QUERIES.length).toBeGreaterThan(20)
    expect(STARTUPHUB_BULK_QUERIES.length).toBeLessThan(120)
  })

  it('covers Tier-1 CA/US/UK campus keywords', () => {
    const hay = STARTUPHUB_BULK_QUERIES.join(' ').toLowerCase()
    for (const token of ['waterloo', 'toronto', 'stanford', 'mit', 'oxford', 'velocity', 'cdl', 'dmz']) {
      expect(hay).toContain(token)
    }
  })

  it('avoids sprawling unrelated geography fill (LATAM/Africa bulk)', () => {
    const hay = STARTUPHUB_BULK_QUERIES.join(' ').toLowerCase()
    expect(hay).not.toContain('nigeria')
    expect(hay).not.toContain('latam')
    expect(hay).not.toContain('metaverse')
  })
})
