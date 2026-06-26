import { advanceBatchJob } from '@/lib/batch-advance-server'
import { listRunningBatchJobsDb, isBatchDbEnabled } from '@/lib/batch-jobs'

export const maxDuration = 300

export async function GET(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isBatchDbEnabled()) {
    return Response.json({ advanced: 0, skipped: 'no database' })
  }

  const jobs = await listRunningBatchJobsDb(5)
  let advanced = 0

  for (const job of jobs) {
    try {
      const result = await advanceBatchJob(job.id, job.userId)
      if (result.processed && !result.busy) advanced++
    } catch (err) {
      console.error('[cron/batch-tick]', job.id, err.message)
    }
  }

  return Response.json({ advanced, jobs: jobs.length })
}
