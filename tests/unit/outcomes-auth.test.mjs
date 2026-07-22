import { describe, it, expect } from 'vitest'
import { RATE_LIMITS } from '@/lib/rate-limit'

describe('outcomes write guard', () => {
  it('rate limits outcomes to 20/hour', () => {
    expect(RATE_LIMITS.outcomes.limit).toBe(20)
  })
})
