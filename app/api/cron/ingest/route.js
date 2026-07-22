import { isCronAuthorized } from '@/lib/health-payload'
import { seedSourcesFromBundledFile, runIngestBatch } from '@/lib/server/ingest-batch'
import { runIndexCheckBatch } from '@/lib/server/index-check-batch'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Cron / operator ingest kick.
 * Auth: Authorization: Bearer CRON_SECRET
 * Query: ?cadence=daily|weekly&limit=5&indexCheck=1
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!isCronAuthorized(req.headers.get('authorization') || '', secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const cadence = url.searchParams.get('cadence') || 'daily'
  const limit = Math.min(Number(url.searchParams.get('limit') || '5'), 15)
  const wantIndex = url.searchParams.get('indexCheck') !== '0'

  const seed = await seedSourcesFromBundledFile()
  const ingest = await runIngestBatch({ cadence, limit })
  let indexCheck = null
  if (wantIndex) {
    indexCheck = await runIndexCheckBatch({ limit: Math.min(limit, 8) })
  }

  return Response.json({
    ok: true,
    seed,
    ingest,
    indexCheck,
    at: new Date().toISOString(),
  })
}
