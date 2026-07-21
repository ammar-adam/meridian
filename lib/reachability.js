/**
 * Founder reachability — email pattern + LinkedIn search paths.
 * Never invents verified LinkedIn profile URLs; always offers a search path
 * when founder names exist. Pattern emails are labeled as guesses.
 */

function normalizeDomain(domain) {
  return (domain || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase()
    .trim()
}

function splitFounders(personName) {
  if (!personName) return []
  return String(personName)
    .split(/,| & | and /i)
    .map(s => s.trim())
    .filter(Boolean)
}

function linkedInSearchUrl(founderName, companyName) {
  const q = [founderName, companyName].filter(Boolean).join(' ')
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`
}

function patternEmails(founderName, domain) {
  const clean = normalizeDomain(domain)
  const parts = founderName.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.replace(/[^a-z]/g, '')
  const last = parts[parts.length - 1]?.replace(/[^a-z]/g, '')
  if (!first || !last || first === last || !clean.includes('.')) return []
  return [
    `${first}@${clean}`,
    `${first}.${last}@${clean}`,
  ]
}

/**
 * Build reachability for a Discover/Flow company row.
 * @returns {{ reachable: boolean, channels: string[], founders: object[], score: number }}
 */
export function buildReachability(company) {
  const founders = splitFounders(company?.personName)
  const domain = normalizeDomain(company?.domain || company?.url)
  const verifiedEmails = Array.isArray(company?.founderEmails) ? company.founderEmails : []
  const verifiedLinkedIn = Array.isArray(company?.linkedinUrls) ? company.linkedinUrls : []

  const founderRows = founders.map((name, i) => {
    const emails = verifiedEmails.length
      ? verifiedEmails.filter(Boolean)
      : patternEmails(name, domain)
    const linkedin = verifiedLinkedIn[i] || linkedInSearchUrl(name, company?.name)
    return {
      name,
      emails,
      emailConfidence: verifiedEmails.length ? 'verified' : (emails.length ? 'pattern' : null),
      linkedinUrl: linkedin,
      linkedinKind: verifiedLinkedIn[i] ? 'profile' : 'search',
    }
  })

  const hasEmail = founderRows.some(f => f.emails?.length) || verifiedEmails.length > 0
  const hasLinkedIn = founderRows.some(f => f.linkedinUrl) || verifiedLinkedIn.length > 0
  const channels = []
  if (hasLinkedIn) channels.push('linkedin')
  if (hasEmail) channels.push('email')
  if (domain) channels.push('domain')

  const reachable = Boolean(founders.length && (hasLinkedIn || hasEmail))
  let score = 0
  if (founders.length) score += 40
  if (hasLinkedIn) score += 30
  if (hasEmail) score += 20
  if (domain) score += 10

  return {
    reachable,
    channels,
    founders: founderRows,
    score,
    primaryEmail: founderRows.find(f => f.emails?.length)?.emails?.[0] || verifiedEmails[0] || null,
    primaryLinkedIn: founderRows[0]?.linkedinUrl || verifiedLinkedIn[0] || null,
  }
}

export function annotateReachability(companies = []) {
  return companies.map((c) => {
    const reach = buildReachability(c)
    return { ...c, reach }
  })
}

export function reachabilitySummary(companies = []) {
  const list = companies || []
  const reachable = list.filter(c => c.reach?.reachable).length
  return {
    total: list.length,
    reachable,
    rate: list.length ? reachable / list.length : 0,
  }
}
