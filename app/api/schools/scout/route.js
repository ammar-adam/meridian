import { enforceRateLimit } from '@/lib/api-guard'
import { runSchoolScout, runSchoolCoverageSweep } from '@/lib/server/school-scout'

export const maxDuration = 120

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  if (body.all || body.coverage) {
    const result = await runSchoolCoverageSweep({
      limit: Math.min(Number(body.limit) || 6, 13),
      queriesPerSchool: Math.min(Number(body.queries) || 1, 2),
    })
    return Response.json(result)
  }

  const schoolId = body.schoolId || body.id
  if (!schoolId) {
    return Response.json({ error: 'schoolId required' }, { status: 400 })
  }

  const result = await runSchoolScout(schoolId, {
    queries: Math.min(Number(body.queries) || 1, 2),
  })
  if (!result.ok) return Response.json(result, { status: 404 })
  return Response.json(result)
}
