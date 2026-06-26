/** Brief research depth — quick uses sonar (~1 min), deep uses sonar-deep-research (~3–5 min). */
export const RESEARCH_MODES = {
  quick: {
    id: 'quick',
    label: 'Quick',
    hint: '~60–90 seconds',
    timeoutMs: 120_000,
  },
  deep: {
    id: 'deep',
    label: 'Deep',
    hint: '~3–5 minutes',
    timeoutMs: 300_000,
  },
}

export function resolveResearchMode(mode) {
  return mode === 'deep' ? 'deep' : 'quick'
}

export function timeoutForMode(mode) {
  return RESEARCH_MODES[resolveResearchMode(mode)].timeoutMs
}
