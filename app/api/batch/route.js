import crypto from 'crypto'
import { enforceRateLimit } from '@/lib/api-guard'
import { resolveActorId } from '@/lib/actor-id'
import {
  createBatchJobDb,
  getActiveBatchJobDb,
  updateBatchJobDb,
  isBatchDbEnabled,
} from '@/lib/batch-jobs'

export const maxDuration = 30

export async function GET(req) {
  const limited = await enforceRateLimit(req, 'batch')
  if (limited) return limited

  if (!isBatchDbEnabled()) {
    return Response.json({ job: null })
  }

  const userId = await resolveActorId(req)
  const job = await getActiveBatchJobDb(userId)
  return Response.json({ job })
}

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'batch')
  if (limited) return limited

  const { urls, researchMode, sourceContext } = await req.json()
  if (!Array.isArray(urls) || !urls.length) {
    return Response.json({ error: 'urls array is required' }, { status: 400 })
  }

  const userId = await resolveActorId(req)

  if (!isBatchDbEnabled()) {
    return Response.json({
      id: null,
      status: 'running',
      researchMode: researchMode || 'auto',
      urls: urls.slice(0, 50),
      results: urls.slice(0, 50).map(url => ({ url, status: 'pending' })),
      progress: { completed: 0, failed: 0, skipped: 0, total: urls.length, current: null },
      sourceContext: sourceContext || null,
    })
  }

  const job = await createBatchJobDb({
    userId,
    urls: urls.slice(0, 50),
    researchMode,
    sourceContext,
  })

  if (!job) return Response.json({ error: 'Failed to create batch job' }, { status: 500 })

  const running = await updateBatchJobDb(job.id, userId, { status: 'running' })
  return Response.json(running || { ...job, status: 'running' })
}
