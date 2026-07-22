import { describe, it, expect } from 'vitest'
import { validateClaimPayload, CLAIM_STAGES, CLAIM_LIMITS } from '@/lib/claim-validation'

describe('claim payload validation', () => {
  const base = { companyName: 'Simantic', email: 'founder@simantic.com' }

  it('accepts the minimal claim', () => {
    const r = validateClaimPayload(base)
    expect(r.ok).toBe(true)
    expect(r.value.companyName).toBe('Simantic')
    expect(r.value.claimerEmail).toBe('founder@simantic.com')
    expect(r.value.stage).toBe(null)
    expect(r.value.deckUrl).toBe(null)
  })

  it('rejects missing company or invalid email', () => {
    expect(validateClaimPayload({ email: 'a@b.co' }).ok).toBe(false)
    expect(validateClaimPayload({ companyName: 'X', email: 'not-an-email' }).ok).toBe(false)
    expect(validateClaimPayload(null).ok).toBe(false)
  })

  it('keeps structured fields when valid', () => {
    const r = validateClaimPayload({
      ...base,
      stage: 'seed',
      raiseAmount: '$1.5M open',
      deckUrl: 'https://docsend.com/view/abc',
      sectors: 'AI infrastructure, healthcare',
    })
    expect(r.ok).toBe(true)
    expect(r.value.stage).toBe('seed')
    expect(r.value.raiseAmount).toBe('$1.5M open')
    expect(r.value.deckUrl).toBe('https://docsend.com/view/abc')
    expect(r.value.sectors).toBe('AI infrastructure, healthcare')
  })

  it('normalizes unknown stages to null and only allows the whitelist', () => {
    expect(CLAIM_STAGES).toEqual(['pre-seed', 'seed', 'series-a', 'later'])
    expect(validateClaimPayload({ ...base, stage: 'unicorn' }).value.stage).toBe(null)
    expect(validateClaimPayload({ ...base, stage: 'series-a' }).value.stage).toBe('series-a')
  })

  it('repairs scheme-less deck links and rejects garbage ones', () => {
    expect(validateClaimPayload({ ...base, deckUrl: 'docsend.com/view/abc' }).value.deckUrl)
      .toBe('https://docsend.com/view/abc')
    expect(validateClaimPayload({ ...base, deckUrl: 'javascript:alert(1)' }).ok).toBe(false)
    expect(validateClaimPayload({ ...base, deckUrl: '   ' }).value.deckUrl).toBe(null)
  })

  it('caps oversized fields', () => {
    const r = validateClaimPayload({
      ...base,
      founderName: 'f'.repeat(9999),
      message: 'm'.repeat(9999),
      raiseAmount: 'r'.repeat(9999),
      sectors: 's'.repeat(9999),
    })
    expect(r.ok).toBe(true)
    expect(r.value.founderName.length).toBe(CLAIM_LIMITS.founderName)
    expect(r.value.message.length).toBe(CLAIM_LIMITS.message)
    expect(r.value.raiseAmount.length).toBe(CLAIM_LIMITS.raiseAmount)
    expect(r.value.sectors.length).toBe(CLAIM_LIMITS.sectors)
  })
})
