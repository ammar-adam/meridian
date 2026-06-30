import { describe, it, expect } from 'vitest'
import { runSmokeChecks, resolveSmokeBaseUrl, DEFAULT_PRODUCTION } from '../lib/smoke-checks.mjs'

const SMOKE_URL = process.env.SMOKE_BASE_URL || process.env.MERIDIAN_PRODUCTION_URL

describe.skipIf(!SMOKE_URL)('production smoke', () => {
  it('health, scrape, and batch endpoints respond', async () => {
    const base = resolveSmokeBaseUrl(SMOKE_URL || DEFAULT_PRODUCTION)
    const { failed, results } = await runSmokeChecks(base)
    const errors = results.filter(r => !r.ok).map(r => `${r.name}: ${r.error}`)
    expect(errors, errors.join('; ')).toEqual([])
    expect(failed).toBe(0)
  })
})
