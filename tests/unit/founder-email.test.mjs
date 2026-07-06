import { describe, it, expect } from 'vitest'
import { guessFounderEmails } from '@/lib/founder-email'

describe('guessFounderEmails', () => {
  it('returns pattern candidates for full names', async () => {
    const results = await guessFounderEmails('Patrick Collison', 'stripe.com')
    expect(results.length).toBe(4)
    expect(results[0].email).toBe('patrick@stripe.com')
    expect(results.some(r => r.email === 'patrick.collison@stripe.com')).toBe(true)
    expect(results[0].confidence).toMatch(/pattern-matched/)
  })

  it('returns empty for single names', async () => {
    const results = await guessFounderEmails('Madonna', 'stripe.com')
    expect(results).toEqual([])
  })
})
