import { describe, it, expect } from 'vitest'
import { sourceIdFromUrl, normalizeCadence } from '@/lib/server/source-registry'

describe('sourceIdFromUrl', () => {
  it('prefers explicit id', () => {
    expect(sourceIdFromUrl('https://example.com', 'my-id')).toBe('my-id')
  })

  it('hashes url when no id', () => {
    const a = sourceIdFromUrl('https://www.velocityincubator.com/news')
    const b = sourceIdFromUrl('https://www.velocityincubator.com/news')
    const c = sourceIdFromUrl('https://other.example/news')
    expect(a).toBe(b)
    expect(a).toHaveLength(16)
    expect(a).not.toBe(c)
  })

  it('returns empty for empty url', () => {
    expect(sourceIdFromUrl('')).toBe('')
  })
})

describe('normalizeCadence', () => {
  it('accepts weekly', () => {
    expect(normalizeCadence('weekly')).toBe('weekly')
    expect(normalizeCadence('WEEKLY')).toBe('weekly')
  })

  it('defaults everything else to daily', () => {
    expect(normalizeCadence('daily')).toBe('daily')
    expect(normalizeCadence('')).toBe('daily')
    expect(normalizeCadence('monthly')).toBe('daily')
  })
})
