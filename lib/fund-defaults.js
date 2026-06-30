import { DEFAULT_METRIC_PREFERENCES } from '@/lib/metric-preferences'

export const DEFAULT_THESIS_INSTRUCTIONS = `
For the THESIS_HEADLINE: write a single declarative statement specific to
why this company fits this fund's mandate. Do not write something that could
apply to any fund. Reference at least one specific portfolio company or fund criterion.

For the three thesis points, choose the three most relevant angles:
- Portfolio overlap: which portcos are natural first customers and why
- Distribution: how the fund's network accelerates this company
- Mandate fit: how this aligns with the fund's stated investment thesis
- Strategic value: what this fund can offer beyond capital

Each thesis point must reference at least one specific company name from the
portfolio or a concrete use case from the fund thesis. No generic statements.
`

/** Used when no fund profile exists — brief still works immediately */
export const GUEST_FUND_API_CONTEXT = {
  id: 'guest',
  isGuest: true,
  fundName: 'Your Fund',
  fundFooterName: 'Your Fund',
  fundLogoUrl: '',
  strategyId: 'primary',
  strategyName: 'Primary',
  trackingId: 'guest',
  thesis:
    'Venture fund evaluating commercial-stage technology companies. ' +
    'Preference for enterprise distribution advantages, defensible data moats, ' +
    'and teams with domain expertise. Series A and B in North America.',
  portfolio: [],
  mandate: {
    stages: ['Series A', 'Series B'],
    geographies: ['North America'],
    sectors: ['enterprise', 'fintech', 'health', 'AI'],
  },
  thesisInstructions: DEFAULT_THESIS_INSTRUCTIONS,
  metricPreferences: [...DEFAULT_METRIC_PREFERENCES],
}

export function isGuestFundContext(ctx) {
  return !ctx || ctx.id === 'guest' || ctx.isGuest === true
}
