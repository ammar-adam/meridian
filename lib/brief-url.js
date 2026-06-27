import { normalizeUrl, extractDomain } from '@/lib/url-utils'

/** Client + server validation for the Brief URL field. */
export function validateBriefUrl(raw) {
  const normalized = normalizeUrl(raw)
  if (!normalized) return { ok: false, message: 'Enter a company URL' }
  const domain = extractDomain(normalized)
  if (!domain || !domain.includes('.')) {
    return { ok: false, message: "That doesn't look like a valid URL — try company.com" }
  }
  return { ok: true, url: normalized }
}
