import { describe, it, expect } from 'vitest'
import { normalizeCadence } from '@/lib/server/source-registry'

describe('ingest helpers', () => {
  it('normalizeCadence only allows daily|weekly', () => {
    expect(normalizeCadence('daily')).toBe('daily')
    expect(normalizeCadence('weekly')).toBe('weekly')
    expect(normalizeCadence('monthly')).toBe('daily')
    expect(normalizeCadence('')).toBe('daily')
  })
})
