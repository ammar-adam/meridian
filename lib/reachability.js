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

/**
 * Build reachability for a Discover/Flow company row.
 *
 * Addresses are facts: only verified emails ever appear. Pattern-guessed
 * addresses are banned from output entirely — drafting outreach is the
 * product's answer, guessing addresses is not (see docs/rebuild-plan.md).
 * @returns {{ reachable: boolean, channels: string[], founders: object[], score: number }}
 */
export function buildReachability(company) {
  const founders = splitFounders(company?.personName)
  const domain = normalizeDomain(company?.domain || company?.url)
  const verifiedEmails = Array.isArray(company?.founderEmails) ? company.founderEmails : []
  const verifiedLinkedIn = Array.isArray(company?.linkedinUrls) ? company.linkedinUrls : []

  const founderRows = founders.map((name, i) => {
    const emails = verifiedEmails.filter(Boolean)
    const linkedin = verifiedLinkedIn[i] || linkedInSearchUrl(name, company?.name)
    return {
      name,
      emails,
      emailConfidence: emails.length ? 'verified' : null,
      linkedinUrl: linkedin,
      linkedinKind: verifiedLinkedIn[i] ? 'profile' : 'search',
    }
  })

  const hasEmail = verifiedEmails.length > 0
  const hasLinkedIn = founderRows.some(f => f.linkedinUrl) || verifiedLinkedIn.length > 0
  const channels = []
  if (hasLinkedIn) channels.push('linkedin')
  if (hasEmail) channels.push('email')
  if (domain) channels.push('website')

  // Honest reachability: a founder handle (LinkedIn/email) OR a company website
  // is a real outreach path. We do not hide rows to inflate the rate.
  const founderReach = Boolean(founders.length && (hasLinkedIn || hasEmail))
  const reachable = Boolean(founderReach || domain)
  let score = 0
  if (founders.length) score += 40
  if (hasLinkedIn) score += 30
  if (hasEmail) score += 20
  if (domain) score += 10

  return {
    reachable,
    founderReach,
    channels,
    founders: founderRows,
    score,
    primaryEmail: verifiedEmails[0] || null,
    primaryLinkedIn: founderRows[0]?.linkedinUrl || verifiedLinkedIn[0] || null,
    website: domain ? `https://${domain}` : null,
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
  const founderReach = list.filter(c => c.reach?.founderReach).length
  return {
    total: list.length,
    reachable,
    founderReach,
    rate: list.length ? reachable / list.length : 0,
    founderRate: list.length ? founderReach / list.length : 0,
  }
}
