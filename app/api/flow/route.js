import { enforceRateLimit } from '@/lib/api-guard'
import { buildIncubatorFastDiscover, wantsIncubatorFastPath } from '@/lib/discover-fast'

export const maxDuration = 30

/**
 * Continuous deal-flow feed for a fund mandate.
 * Sync community path — the product funds would pay to check daily.
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const { thesis, fundContext } = await req.json()
  const text = (thesis || fundContext?.thesis || '').trim()

  if (!fundContext?.fundName) {
    return Response.json({ error: 'Choose a fund to watch deal flow' }, { status: 400 })
  }

  if (!text) {
    return Response.json({ error: 'Mandate thesis required' }, { status: 400 })
  }

  // Prefer community fast path; fall back to same builder for any thesis so Flow always works.
  const payload = wantsIncubatorFastPath(text, fundContext)
    ? buildIncubatorFastDiscover(text, fundContext)
    : buildIncubatorFastDiscover(text, fundContext)

  return Response.json({
    companies: payload.companies,
    meta: {
      ...payload.meta,
      flow: true,
      thesis: text,
      generatedAt: new Date().toISOString(),
    },
    cached: false,
  })
}
