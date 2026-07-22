import { describe, it, expect } from 'vitest'
import { isCronAuthorized, shapePublicHealth } from '@/lib/health-payload'

describe('health payload redaction', () => {
  it('public shape contains ONLY ok + features', () => {
    const full = {
      ok: true,
      anthropic: true,
      anthropicKeyPresent: true,
      anthropicPing: { ok: false, error: 'secret detail' },
      perplexity: true,
      startuphub: true,
      database: true,
      clerk: true,
      clerkMode: 'development',
      clerkDemoRisk: true,
      features: { aiGeneration: true, shareLinks: false },
    }
    const pub = shapePublicHealth(full)
    expect(Object.keys(pub).sort()).toEqual(['features', 'ok'])
    expect(pub.ok).toBe(true)
    expect(pub.features).toEqual({ aiGeneration: true, shareLinks: false })
    expect(JSON.stringify(pub)).not.toContain('secret detail')
    expect(JSON.stringify(pub)).not.toContain('clerk')
  })

  it('tolerates missing fields', () => {
    expect(shapePublicHealth(undefined)).toEqual({ ok: false, features: {} })
    expect(shapePublicHealth({ ok: 'yes' })).toEqual({ ok: false, features: {} })
  })
})

describe('cron authorization', () => {
  it('matches only the exact bearer token', () => {
    expect(isCronAuthorized('Bearer s3cret', 's3cret')).toBe(true)
    expect(isCronAuthorized('Bearer s3cret ', 's3cret')).toBe(false)
    expect(isCronAuthorized('bearer s3cret', 's3cret')).toBe(false)
    expect(isCronAuthorized('Bearer wrong', 's3cret')).toBe(false)
    expect(isCronAuthorized('', 's3cret')).toBe(false)
  })

  it('never authorizes when the secret is unset or blank', () => {
    expect(isCronAuthorized('Bearer ', '')).toBe(false)
    expect(isCronAuthorized('Bearer undefined', undefined)).toBe(false)
    expect(isCronAuthorized('Bearer  ', '  ')).toBe(false)
  })
})
