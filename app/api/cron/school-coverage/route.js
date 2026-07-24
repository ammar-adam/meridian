import { runSchoolCoverageSweep } from '@/lib/server/school-scout'
import { runEmergingSchoolDiscovery } from '@/lib/server/emerging-schools'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Continuous school coverage — Tier-1 scout + emerging discovery.
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coverage = await runSchoolCoverageSweep({ limit: 8, queriesPerSchool: 1 })
  const emerging = await runEmergingSchoolDiscovery({ limit: 10 })

  return Response.json({
    ok: true,
    at: new Date().toISOString(),
    coverage,
    emerging: {
      proposals: emerging.proposals?.length || 0,
      jobId: emerging.jobId,
    },
  })
}
