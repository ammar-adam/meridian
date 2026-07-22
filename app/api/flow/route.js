import { enforceRateLimit } from '@/lib/api-guard'
import { resolveActorId } from '@/lib/actor-id'
import { buildFlowFeed } from '@/lib/server/flow-feed'

export const maxDuration = 30

/**
 * Continuous deal-flow feed for a fund mandate.
 * Incubator seeds + durable company records (including scout), mandate-matched.
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const { thesis, fundContext } = await req.json()
  let actorId = null
  try {
    actorId = await resolveActorId(req)
  } catch { /* optional */ }

  const result = await buildFlowFeed({
    thesis,
    fundContext,
    dispatchWebhooks: true,
    actorId,
  })

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json({
    companies: result.companies,
    meta: result.meta,
    cached: false,
  })
}
