import { buildPilotCaseStudy } from '@/lib/pilot-case'

export const maxDuration = 15

export async function GET() {
  return Response.json(buildPilotCaseStudy())
}
