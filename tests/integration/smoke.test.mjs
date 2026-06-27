import { describe, it, expect } from 'vitest'
import { runSmokeChecks } from '../lib/smoke-checks.mjs'

const BASE = process.env.BASE_URL || process.env.SMOKE_BASE_URL

describe.skipIf(!BASE)('production smoke', () => {
  it('health, scrape, and batch endpoints respond', async () => {
    const { failed, results } = await runSmokeChecks(BASE)
    const errors = results.filter(r => !r.ok).map(r => `${r.name}: ${r.error}`)
    expect(errors, errors.join('; ')).toEqual([])
    expect(failed).toBe(0)
  })
})
