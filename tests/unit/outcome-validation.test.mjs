import { describe, it, expect } from 'vitest'
import { validateOutcomePayload, OUTCOME_LIMITS } from '@/lib/outcome-validation'

describe('outcome payload validation', () => {
  it('accepts a normal pursue payload', () => {
    const r = validateOutcomePayload({
      entityName: 'SCADABLE',
      domain: 'scadable.com',
      outcome: 'pursue',
      fundName: 'My Fund',
    })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({
      entityName: 'SCADABLE',
      domain: 'scadable.com',
      outcome: 'pursue',
      fundName: 'My Fund',
    })
  })

  it('rejects missing entityName and unknown outcomes', () => {
    expect(validateOutcomePayload({ outcome: 'pursue' }).ok).toBe(false)
    expect(validateOutcomePayload({ entityName: 'X', outcome: 'maybe' }).ok).toBe(false)
    expect(validateOutcomePayload({ entityName: '  ', outcome: 'pass' }).ok).toBe(false)
    expect(validateOutcomePayload(null).ok).toBe(false)
  })

  it('caps oversized fields instead of storing arbitrary payloads', () => {
    const r = validateOutcomePayload({
      entityName: 'a'.repeat(10_000),
      domain: 'b'.repeat(10_000),
      fundName: 'c'.repeat(10_000),
      outcome: 'pass',
    })
    expect(r.ok).toBe(true)
    expect(r.value.entityName.length).toBe(OUTCOME_LIMITS.entityName)
    expect(r.value.domain.length).toBe(OUTCOME_LIMITS.domain)
    expect(r.value.fundName.length).toBe(OUTCOME_LIMITS.fundName)
  })

  it('normalizes empty optional fields to null and rejects non-strings', () => {
    const r = validateOutcomePayload({ entityName: 'X', outcome: 'pass', domain: '', fundName: { evil: 1 } })
    expect(r.ok).toBe(true)
    expect(r.value.domain).toBe(null)
    expect(r.value.fundName).toBe(null)
  })
})
