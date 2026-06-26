import { enforceRateLimit } from '@/lib/api-guard'
import { getUserId } from '@/lib/auth-server'
import { getBatchJobDb, updateBatchJobDb, isBatchDbEnabled } from '@/lib/batch-jobs'

export const maxDuration = 30

export async function GET(req, { params }) {
  const limited = enforceRateLimit(req, 'batch')
  if (limited) return limited

  const userId = (await getUserId()) || 'guest'
  if (!isBatchDbEnabled()) {
    return Response.json({ error: 'Database not configured' }, { status: 503 })
  }

  const job = await getBatchJobDb(params.id, userId)
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
  return Response.json(job)
}

export async function PATCH(req, { params }) {
  const limited = enforceRateLimit(req, 'batch')
  if (limited) return limited

  const userId = (await getUserId()) || 'guest'
  if (!isBatchDbEnabled()) {
    return Response.json({ ok: true })
  }

  const body = await req.json()
  const job = await updateBatchJobDb(params.id, userId, body)
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
  return Response.json(job)
}
