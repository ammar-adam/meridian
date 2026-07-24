import { isCronAuthorized } from '@/lib/health-payload'
import { runSchoolCoverageSweep } from '@/lib/server/school-scout'
import { runEmergingSchoolDiscovery } from '@/lib/server/emerging-schools'
import { seedSourcesFromBundledFile, runIngestBatch } from '@/lib/server/ingest-batch'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Continuous school coverage — Tier-1 scout + emerging discovery + campus scrape.
 * Auth: Authorization: Bearer CRON_SECRET
 *
 * Query: ?ingest=0 to skip campus source scrape; ?limit=8 schools
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
  const limit = Math.min(Number(url.searchParams.get('limit') || '8'), 13)
  const wantIngest = url.searchParams.get('ingest') !== '0'
  const scrapeLimit = Math.min(Number(url.searchParams.get('scrapeLimit') || '10'), 20)

  const coverage = await runSchoolCoverageSweep({ limit, queriesPerSchool: 1 })
  let emerging = { proposals: 0 }
  try {
    const e = await runEmergingSchoolDiscovery({ limit: 10 })
    emerging = { proposals: e.proposals?.length || 0, jobId: e.jobId }
  } catch (err) {
    emerging = { proposals: 0, error: err.message }
  }

  let ingest = null
  if (wantIngest) {
    try {
      const seed = await seedSourcesFromBundledFile()
      const batch = await runIngestBatch({ cadence: 'daily', limit: scrapeLimit })
      ingest = { seed, batch }
    } catch (err) {
      ingest = { error: err.message }
    }
  }

  return Response.json({
    ok: true,
    thesis: 'school_ecosystem',
    at: new Date().toISOString(),
    coverage,
    emerging,
    ingest,
  })
}
