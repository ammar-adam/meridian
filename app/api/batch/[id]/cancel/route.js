import { enforceRateLimit } from '@/lib/api-guard'
import { getUserId } from '@/lib/auth-server'
import { updateBatchJobDb, isBatchDbEnabled } from '@/lib/batch-jobs'

export const maxDuration = 30

export async function POST(req, { params }) {
  const limited = enforceRateLimit(req, 'batch')
  if (limited) return limited

  const userId = (await getUserId()) || 'guest'
  if (!isBatchDbEnabled()) {
    return Response.json({ ok: true, status: 'cancelled' })
  }

  const job = await updateBatchJobDb(params.id, userId, { status: 'cancelled' })
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
  return Response.json(job)
}
