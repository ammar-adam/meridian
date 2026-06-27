import { describe, it, expect } from 'vitest'
import { validateBriefUrl } from '@/lib/brief-url'

describe('validateBriefUrl', () => {
  it('rejects empty input', () => {
    const r = validateBriefUrl('')
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/Enter a company URL/)
  })

  it('rejects hostnames without a dot', () => {
    const r = validateBriefUrl('localhost')
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/valid URL/)
  })

  it('accepts bare domains and normalizes', () => {
    const r = validateBriefUrl('stripe.com')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://stripe.com')
  })

  it('accepts full URLs', () => {
    const r = validateBriefUrl('https://www.anthropic.com/about')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://www.anthropic.com/about')
  })
})
