/**
 * Central model config. Override via env for testing; defaults preserve memo quality.
 */
export const MODELS = {
  claude: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  claudeFast: process.env.ANTHROPIC_FAST_MODEL || 'claude-haiku-4-5-20251001',
  /** Full company research for briefs — keep sonar-deep-research for quality */
  perplexityResearch: process.env.PERPLEXITY_RESEARCH_MODEL || 'sonar-deep-research',
  /** Discover sourcing + fund enrich — sonar is sufficient and much cheaper */
  perplexitySearch: process.env.PERPLEXITY_SEARCH_MODEL || 'sonar',
}
