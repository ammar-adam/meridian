import { runEmergingSchoolDiscovery, listEmergingProposals } from '@/lib/server/emerging-schools'
import { enforceRateLimit } from '@/lib/api-guard'

export const maxDuration = 60

export async function GET() {
  const proposals = await listEmergingProposals({ limit: 20 })
  return Response.json({
    ok: true,
    pitch: 'Emerging schools are proposed when university sources appear outside Tier-1 coverage — the Waterloo-before-Waterloo path.',
    proposals,
  })
}

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited
  const result = await runEmergingSchoolDiscovery({ limit: 12 })
  return Response.json(result)
}
