import { describe, it, expect } from 'vitest'
import { parseAnthropicError } from '@/lib/anthropic'

describe('parseAnthropicError', () => {
  it('maps deprecated models to a friendly message', () => {
    const raw = JSON.stringify({
      error: { type: 'not_found_error', message: 'model claude-3-5-haiku-20241022 is deprecated' },
    })
    expect(parseAnthropicError(raw)).toMatch(/unavailable/i)
  })

  it('maps rate limits', () => {
    const raw = JSON.stringify({ error: { type: 'rate_limit_error', message: 'rate limit' } })
    expect(parseAnthropicError(raw)).toMatch(/Rate limited/i)
  })

  it('maps auth errors', () => {
    const raw = JSON.stringify({ error: { type: 'authentication_error', message: 'invalid key' } })
    expect(parseAnthropicError(raw)).toMatch(/API key invalid/i)
  })

  it('returns message for unknown types', () => {
    const raw = JSON.stringify({ error: { type: 'api_error', message: 'something broke' } })
    expect(parseAnthropicError(raw)).toBe('something broke')
  })
})
