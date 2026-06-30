/** Brief research depth — auto uses Perplexity quick for GP-quality briefs. */
export const RESEARCH_MODES = {
  auto: {
    id: 'auto',
    label: 'Auto',
    hint: '~50–75s',
    timeoutMs: 120_000,
  },
  instant: {
    id: 'instant',
    label: 'Instant',
    hint: '~25–40s',
    timeoutMs: 60_000,
  },
  quick: {
    id: 'quick',
    label: 'Quick',
    hint: '~50–75s',
    timeoutMs: 120_000,
  },
  deep: {
    id: 'deep',
    label: 'Deep',
    hint: '~3–5 minutes',
    timeoutMs: 300_000,
  },
}

const VALID_MODES = new Set(['auto', 'instant', 'quick', 'deep'])

export function resolveResearchMode(mode) {
  if (VALID_MODES.has(mode)) return mode
  return 'auto'
}

/** Auto always runs Perplexity quick research — best default for GP-quality briefs. */
export function resolveEffectiveResearchMode(requestedMode, scraped) {
  const mode = resolveResearchMode(requestedMode)
  if (mode === 'auto') return 'quick'
  return mode
}

export function timeoutForMode(mode, scraped = null) {
  const effective = scraped ? resolveEffectiveResearchMode(mode, scraped) : resolveResearchMode(mode)
  return RESEARCH_MODES[effective]?.timeoutMs ?? RESEARCH_MODES.quick.timeoutMs
}

export function needsPerplexity(mode, scraped = null) {
  const effective = scraped ? resolveEffectiveResearchMode(mode, scraped) : resolveResearchMode(mode)
  return effective !== 'instant'
}
