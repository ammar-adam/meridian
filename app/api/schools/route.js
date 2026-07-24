import { listSchoolsServer, schoolCoverageSummary, TIER1_SCHOOLS, sourcesForSchool } from '@/lib/schools/registry'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country') || undefined
  const tier = searchParams.get('tier') || undefined
  const schools = listSchoolsServer({ country, tier })
  const coverage = {
    total: schools.length,
    tier1: TIER1_SCHOOLS.length,
    emerging: 0,
    withSources: schools.filter(s => s.sourceCount > 0).length,
    byCountry: { CA: 0, US: 0, UK: 0 },
    universitySources: schoolCoverageSummary().universitySources,
  }
  for (const s of schools) {
    if (coverage.byCountry[s.country] != null) coverage.byCountry[s.country] += 1
  }

  return Response.json({
    ok: true,
    pitch: 'We connect school ecosystems to fund mandates — only what we can date and source. Tier-1 CA/US/UK first; emerging schools expand over time.',
    coverage,
    schools: schools.map(s => ({
      ...s,
      sources: (s.sources || sourcesForSchool(s)).slice(0, 6),
    })),
  })
}
