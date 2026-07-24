import { listJobs } from '@/lib/server/agent-jobs'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit')) || 40, 100)
  const jobs = await listJobs({ limit })
  return Response.json({
    ok: true,
    note: 'Internal job log (research, school scout, emerging, coverage). Not an agent chat product.',
    jobs,
  })
}
