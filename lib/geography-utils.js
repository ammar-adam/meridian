const CANADA_MARKERS = [
  'canada',
  'canadian',
  'toronto',
  'montreal',
  'vancouver',
  'calgary',
  'edmonton',
  'ottawa',
  'quebec',
  'waterloo',
  'kitchener',
  'winnipeg',
  'halifax',
]

const US_ONLY_MARKERS = [
  ', us',
  ', usa',
  'united states',
  'u.s.',
  'u.s',
  'san francisco',
  'new york',
  'palo alto',
  'austin,',
  'boston,',
  'silicon valley',
  'united states of america',
]

export function normalizeGeographies(parsedGeographies, fundContext) {
  const fromParsed = Array.isArray(parsedGeographies) ? parsedGeographies : []
  const fromFund = fundContext?.mandate?.geographies || []
  const merged = [...fromParsed, ...fromFund].map(g => String(g || '').trim()).filter(Boolean)
  return [...new Set(merged)]
}

export function isCanadianMandate(geographies, fundContext) {
  const geos = normalizeGeographies(geographies, fundContext)
  return geos.some(g => /canada/i.test(g))
}

export function isCanadaOnlyMandate(geographies, fundContext) {
  const geos = normalizeGeographies(geographies, fundContext)
  if (!geos.length) return false
  return geos.every(g => /canada/i.test(g))
}

export function geographyText(company) {
  return [company?.geography, company?.hq_country, company?.hq_city].filter(Boolean).join(', ')
}

export function looksCanadian(company) {
  const text = `${geographyText(company)} ${company?.domain || ''} ${company?.url || ''}`.toLowerCase()
  if (text.includes('.ca')) return true
  return CANADA_MARKERS.some(m => text.includes(m))
}

export function looksUsOnly(company) {
  const text = geographyText(company).toLowerCase()
  if (!text) return false
  if (looksCanadian(company)) return false
  // Bare "US" / "USA" / "U.S." — common in StartupHub and registry rows.
  if (/\b(u\.s\.|usa|united states)\b/.test(text)) return true
  if (/\bus\b/.test(text)) return true
  return US_ONLY_MARKERS.some(m => text.includes(m))
}

/**
 * Soft filter for database seeds — keep unknown geography, drop obvious US-only
 * when mandate is Canada-only.
 */
export function filterSeedsForMandate(companies, geographies, fundContext) {
  if (!isCanadaOnlyMandate(geographies, fundContext)) return companies
  return companies.filter(c => !looksUsOnly(c))
}

export function canadianQuerySuffix(geographies, fundContext) {
  if (!isCanadianMandate(geographies, fundContext)) return ''
  return ' Focus on Canadian companies and founders — HQ in Canada or .ca domains.'
}
