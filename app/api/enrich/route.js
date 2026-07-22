import { enforceRateLimit } from '@/lib/api-guard'
import {
  enrichDomainEmails,
  applyEnrichmentToCompany,
  isEnrichmentEnabled,
} from '@/lib/server/enrichment'

export const maxDuration = 30

/**
 * Verified enrichment — optional Hunter.io domain lookup.
 * Body: { domain, company? } — returns enrichment + optionally merged company row.
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const body = await req.json()
  const domain = body.domain || body.company?.domain
  if (!domain) {
    return Response.json({ error: 'domain required' }, { status: 400 })
  }

  const enrichment = await enrichDomainEmails(domain)
  const company = body.company
    ? applyEnrichmentToCompany(body.company, enrichment)
    : null

  return Response.json({
    enabled: isEnrichmentEnabled(),
    enrichment,
    company,
  })
}
