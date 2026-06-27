import { describe, it, expect } from 'vitest'
import {
  resolveAnthropicModel,
  anthropicModelFallbacks,
  MODELS,
} from '@/lib/api-models'

describe('api-models', () => {
  it('ignores retired env model overrides', () => {
    const resolved = resolveAnthropicModel('claude-3-5-haiku-20241022', 'claude-haiku-4-5-20251001')
    expect(resolved).toBe('claude-haiku-4-5-20251001')
  })

  it('keeps valid custom model overrides', () => {
    const resolved = resolveAnthropicModel('claude-sonnet-4-5', 'claude-sonnet-4-5-20250929')
    expect(resolved).toBe('claude-sonnet-4-5')
  })

  it('falls back when env is empty', () => {
    expect(resolveAnthropicModel('', 'default-model')).toBe('default-model')
    expect(resolveAnthropicModel('your_key_here', 'default-model')).toBe('default-model')
  })

  it('anthropicModelFallbacks dedupes and preserves order', () => {
    const chain = anthropicModelFallbacks(MODELS.claudeFast)
    expect(chain).toContain(MODELS.claudeFast)
    expect(chain).toContain(MODELS.claude)
    expect(chain.length).toBe(new Set(chain).size)
  })
})
