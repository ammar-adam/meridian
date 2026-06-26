import { enforceRateLimit } from '@/lib/api-guard'
import { resolveActorId } from '@/lib/actor-id'
import { advanceBatchJob } from '@/lib/batch-advance-server'
import { isBatchDbEnabled } from '@/lib/batch-jobs'

export const maxDuration = 300

export async function POST(req, { params }) {
  const limited = await enforceRateLimit(req, 'batch')
  if (limited) return limited

  if (!isBatchDbEnabled()) {
    return Response.json({ error: 'Database not configured' }, { status: 503 })
  }

  const actorId = await resolveActorId(req)
  const result = await advanceBatchJob(params.id, actorId)

  if (result.status === 404) {
    return Response.json({ error: result.error }, { status: 404 })
  }
  if (result.status === 503) {
    return Response.json({ error: result.error }, { status: 503 })
  }

  return Response.json(result)
}
