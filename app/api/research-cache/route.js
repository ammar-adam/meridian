import { getFreshResearch } from '@/lib/server/company-records'
import { extractDomain } from '@/lib/url-utils'

export const dynamic = 'force-dynamic'

/** Cached company_research sections for Brief warm-start UI. */
export async function GET(req) {
  const url = new URL(req.url)
  const raw = url.searchParams.get('domain') || url.searchParams.get('url') || ''
  const domain = extractDomain(raw) || raw.trim().toLowerCase().replace(/^www\./, '')
  if (!domain || !domain.includes('.')) {
    return Response.json({ enabled: false, reason: 'domain required' }, { status: 400 })
  }

  const sections = await getFreshResearch(domain, { maxAgeDays: 30 })
  if (!sections?.length) {
    return Response.json({ enabled: true, domain, cached: false, sections: [] })
  }

  return Response.json({
    enabled: true,
    domain,
    cached: true,
    sections: sections.map(s => ({
      section: s.section,
      confidence: s.confidence,
      updatedAt: s.updatedAt,
      preview: String(s.content || '').slice(0, 160),
    })),
  })
}
