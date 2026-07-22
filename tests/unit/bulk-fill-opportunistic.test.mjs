import { describe, it, expect } from 'vitest'
import { bulkFillIfBelowTarget } from '@/lib/server/bulk-fill-opportunistic'

describe('bulkFillIfBelowTarget', () => {
  it('returns db_off without DATABASE_URL', async () => {
    const prev = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    const result = await bulkFillIfBelowTarget({ target: 1500, force: true })
    if (prev) process.env.DATABASE_URL = prev
    expect(result.ran).toBe(false)
    expect(result.reason).toBe('db_off')
  })
})
