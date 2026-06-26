import { enforceRateLimit } from '@/lib/api-guard'
import { resolveActorId } from '@/lib/actor-id'
import { updateBatchJobDb, isBatchDbEnabled } from '@/lib/batch-jobs'

export const maxDuration = 30

export async function POST(req, { params }) {
  const limited = await enforceRateLimit(req, 'batch')
  if (limited) return limited

  const userId = await resolveActorId(req)
  if (!isBatchDbEnabled()) {
    return Response.json({ ok: true, status: 'cancelled' })
  }

  const job = await updateBatchJobDb(params.id, userId, { status: 'cancelled' })
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
  return Response.json(job)
}
