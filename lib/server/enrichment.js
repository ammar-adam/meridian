/**
 * Verified enrichment tier — optional Hunter.io domain email lookup.
 * Never invents emails; only returns Hunter-verified addresses.
 */

const HUNTER_BASE = 'https://api.hunter.io/v2'

export function isEnrichmentEnabled() {
  const key = process.env.HUNTER_API_KEY?.trim()
  return Boolean(key && key !== 'your_key_here')
}

/**
 * Look up verified emails for a domain via Hunter.io.
 * @returns {{ enabled: boolean, emails: string[], pattern: string|null, error?: string }}
 */
export async function enrichDomainEmails(domain) {
  const d = String(domain || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim()

  if (!d || !d.includes('.')) {
    return { enabled: isEnrichmentEnabled(), emails: [], pattern: null, error: 'invalid domain' }
  }

  if (!isEnrichmentEnabled()) {
    return { enabled: false, emails: [], pattern: null, reason: 'HUNTER_API_KEY not set' }
  }

  const key = process.env.HUNTER_API_KEY.trim()
  const url = `${HUNTER_BASE}/domain-search?domain=${encodeURIComponent(d)}&api_key=${encodeURIComponent(key)}&limit=5`

  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        enabled: true,
        emails: [],
        pattern: null,
        error: body?.errors?.[0]?.details || `hunter ${res.status}`,
      }
    }

    const emails = (body?.data?.emails || [])
      .filter(e => e?.value && (e.verification?.status === 'valid' || e.type === 'personal'))
      .map(e => e.value)
      .slice(0, 5)

    return {
      enabled: true,
      domain: d,
      emails,
      pattern: body?.data?.pattern || null,
      organization: body?.data?.organization || null,
    }
  } catch (e) {
    return { enabled: true, emails: [], pattern: null, error: e.message }
  }
}

/**
 * Apply verified enrichment to a Flow company row (non-destructive).
 */
export function applyEnrichmentToCompany(company, enrichment) {
  if (!company || !enrichment?.emails?.length) return company
  const verified = enrichment.emails.filter(Boolean)
  if (!verified.length) return company

  const reach = company.reach || {}
  return {
    ...company,
    founderEmails: [...new Set([...(company.founderEmails || []), ...verified])],
    reach: {
      ...reach,
      primaryEmail: reach.primaryEmail || verified[0],
      directReach: Boolean(reach.directReach || verified.length),
    },
    enrichment: {
      provider: 'hunter',
      verifiedEmails: verified,
      pattern: enrichment.pattern || null,
    },
  }
}
