/**
 * Deep Dive bridge — pre-filled outbound research links (no API keys required).
 */

function cleanName(name) {
  return String(name || '').trim()
}

function cleanDomain(domain) {
  return String(domain || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim()
}

/**
 * @param {{ name?: string, domain?: string, personName?: string }} company
 * @returns {{ harmonic: string, crunchbase: string, google: string, linkedin: string|null }}
 */
export function buildDeepDiveLinks(company = {}) {
  const name = cleanName(company.name || company.companyName)
  const domain = cleanDomain(company.domain || company.url)
  const founder = cleanName((company.personName || '').split(/,| & /)[0])

  const nameQ = encodeURIComponent(name)
  const domainQ = domain ? encodeURIComponent(domain) : ''
  const founderQ = founder ? encodeURIComponent(`${founder} ${name}`) : nameQ

  const googleParts = [name, domain, founder && `${founder} founder`].filter(Boolean)
  const googleQ = encodeURIComponent(googleParts.join(' '))

  return {
    harmonic: domain
      ? `https://console.harmonic.ai/search?query=${domainQ}`
      : `https://console.harmonic.ai/search?query=${nameQ}`,
    crunchbase: domain
      ? `https://www.crunchbase.com/search/organization.companies/field/organizations/website/${domainQ}`
      : `https://www.crunchbase.com/textsearch?q=${nameQ}`,
    google: `https://www.google.com/search?q=${googleQ}`,
    linkedin: founder
      ? `https://www.linkedin.com/search/results/people/?keywords=${founderQ}`
      : null,
  }
}
