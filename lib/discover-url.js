import { normalizeUrl } from '@/lib/url-utils'

/** Resolve a briefing URL from a Discover company row — never guess from name alone */
export function resolveDiscoverCompanyUrl(company) {
  if (!company) return null

  if (company.url?.trim()) {
    const normalized = normalizeUrl(company.url)
    if (normalized) return normalized
  }

  const rawDomain = (company.domain || '').trim().replace(/^https?:\/\//, '').split('/')[0]
  if (rawDomain && rawDomain.includes('.')) {
    return `https://${rawDomain}`
  }

  return null
}
