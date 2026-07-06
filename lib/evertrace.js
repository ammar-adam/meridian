/**
 * EverTrace API placeholder — stealth founder signals for Discover.
 *
 * INTENDED INTEGRATION (next sprint, pending demo):
 * - Fetch pre-announcement founder signals (domain registrations, registry filings,
 *   GitHub, patents, grants) filtered by geography and thesis keywords.
 * - Merge into /api/source results as a distinct source type: `evertrace`.
 * - Tag rows in Discover UI as "Stealth signal — unverified" so analysts treat
 *   them differently from Perplexity/PitchBook/StartupHub results.
 * - Do NOT auto-brief without analyst confirmation — signals are noisy.
 *
 * See docs/evertrace-research.md for go/no-go criteria.
 */

const EVERTRACE_API_BASE = process.env.EVERTRACE_API_BASE || 'https://api.evertrace.ai/v1'

/**
 * @param {Object} params
 * @param {string} params.thesis - natural language mandate / search thesis
 * @param {string[]} [params.geographies] - e.g. ['Canada', 'US']
 * @param {number} [params.limit]
 * @returns {Promise<Array<{ name: string, domain?: string, signalType: string, signalAt?: string, source: 'evertrace', unverified: true }>>}
 */
export async function fetchStealthFounderSignals({ thesis, geographies = [], limit = 25 }) {
  const apiKey = process.env.EVERTRACE_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    console.log('[evertrace] EVERTRACE_API_KEY not configured — returning empty (scaffold)')
    return []
  }

  // Placeholder: wire to EverTrace REST API after demo confirms endpoints + filters.
  // Expected shape:
  // GET ${EVERTRACE_API_BASE}/signals?...
  // Authorization: Bearer ${apiKey}
  void EVERTRACE_API_BASE
  void thesis
  void geographies
  void limit

  throw new Error('EverTrace integration not wired — see docs/evertrace-research.md')
}

/** Normalize EverTrace signal to Discover company seed shape */
export function evertraceSignalToDiscoverSeed(signal) {
  return {
    name: signal.name || signal.companyName || 'Unknown',
    domain: signal.domain || '',
    description: signal.signalType || 'Stealth signal',
    source: 'evertrace',
    unverified: true,
    signalType: signal.signalType,
    signalAt: signal.signalAt,
    fitScore: null,
  }
}
