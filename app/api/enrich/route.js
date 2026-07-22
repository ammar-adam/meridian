import { enforceRateLimit } from '@/lib/api-guard'
import {
  enrichDomainEmails,
  applyEnrichmentToCompany,
  isEnrichmentEnabled,
} from '@/lib/server/enrichment'
import { annotateReachability } from '@/lib/reachability'
import { isRecordsEnabled, upsertCompany, upsertPerson, linkPersonToCompany } from '@/lib/server/company-records'

export const maxDuration = 30

/**
 * Verified enrichment — optional Hunter.io domain lookup.
 * Body: { domain, company? } — returns enrichment + merged company row with reachability.
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

  let company = body.company || null
  if (company) {
    const merged = applyEnrichmentToCompany(company, enrichment)
    company = annotateReachability([merged])[0]
  }

  if (isRecordsEnabled() && enrichment.emails?.length && body.company?.name) {
    try {
      const companyId = await upsertCompany({
        name: body.company.name,
        domain,
      })
      if (companyId) {
        for (const email of enrichment.emails.slice(0, 3)) {
          const personId = await upsertPerson({
            name: body.company.personName?.split(/,| & /)[0]?.trim() || 'Founder',
            email,
            emailStatus: 'verified',
          })
          if (personId) await linkPersonToCompany(companyId, personId, 'founder')
        }
      }
    } catch (e) {
      console.warn('[enrich] persist skipped:', e.message)
    }
  }

  return Response.json({
    enabled: isEnrichmentEnabled(),
    enrichment,
    company,
  })
}
