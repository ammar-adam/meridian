/**
 * Central model config. Override via env for testing; defaults preserve memo quality.
 * Retired env overrides are ignored so a stale Vercel ANTHROPIC_MODEL cannot break Discover.
 */
const RETIRED_ANTHROPIC_MODELS = new Set([
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-latest',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229',
])

const DEFAULT_CLAUDE = 'claude-sonnet-4-5-20250929'
const DEFAULT_CLAUDE_FAST = 'claude-haiku-4-5-20251001'

function resolveAnthropicModel(envValue, fallback) {
  const trimmed = envValue?.trim()
  if (!trimmed || trimmed === 'your_key_here') return fallback
  if (RETIRED_ANTHROPIC_MODELS.has(trimmed)) {
    console.warn(`[api-models] ignoring retired model ${trimmed}, using ${fallback}`)
    return fallback
  }
  return trimmed
}

export const MODELS = {
  claude: resolveAnthropicModel(process.env.ANTHROPIC_MODEL, DEFAULT_CLAUDE),
  claudeFast: resolveAnthropicModel(process.env.ANTHROPIC_FAST_MODEL, DEFAULT_CLAUDE_FAST),
  /** Full company research for briefs — keep sonar-deep-research for quality */
  perplexityResearch: process.env.PERPLEXITY_RESEARCH_MODEL || 'sonar-deep-research',
  /** Discover sourcing + fund enrich — sonar is sufficient and much cheaper */
  perplexitySearch: process.env.PERPLEXITY_SEARCH_MODEL || 'sonar',
}

/** Ordered fallbacks when the requested model is unavailable (bad env, deprecation). */
export function anthropicModelFallbacks(preferred) {
  return [...new Set([
    preferred,
    MODELS.claude,
    'claude-sonnet-4-5',
    MODELS.claudeFast,
    DEFAULT_CLAUDE,
    DEFAULT_CLAUDE_FAST,
  ].filter(Boolean))]
}
