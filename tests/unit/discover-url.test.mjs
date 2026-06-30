import { describe, it, expect } from 'vitest'
import { resolveDiscoverCompanyUrl } from '@/lib/discover-url'

describe('resolveDiscoverCompanyUrl', () => {
  it('prefers explicit url', () => {
    expect(resolveDiscoverCompanyUrl({
      name: 'Armada',
      url: 'https://armada.ai',
      domain: 'armada.com',
    })).toBe('https://armada.ai')
  })

  it('builds from domain when url missing', () => {
    expect(resolveDiscoverCompanyUrl({
      name: 'Linear',
      domain: 'linear.app',
    })).toBe('https://linear.app')
  })

  it('returns null when only name is present — no guessing', () => {
    expect(resolveDiscoverCompanyUrl({ name: 'Armada' })).toBeNull()
  })
})
