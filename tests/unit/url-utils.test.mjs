import { describe, it, expect } from 'vitest'
import { normalizeUrl, extractDomain } from '@/lib/url-utils'

describe('url-utils', () => {
  it('normalizeUrl adds https and strips trailing slash', () => {
    expect(normalizeUrl('stripe.com')).toBe('https://stripe.com')
    expect(normalizeUrl('https://stripe.com/')).toBe('https://stripe.com')
  })

  it('normalizeUrl returns null for empty input', () => {
    expect(normalizeUrl('')).toBeNull()
    expect(normalizeUrl('   ')).toBeNull()
  })

  it('extractDomain strips www', () => {
    expect(extractDomain('https://www.stripe.com/pricing')).toBe('stripe.com')
    expect(extractDomain('stripe.com')).toBe('stripe.com')
  })
})
