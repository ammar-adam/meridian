/**
 * Founder reachability — email pattern + LinkedIn search paths.
 * Never invents verified LinkedIn profile URLs; always offers a search path
 * when founder names exist. Pattern emails are labeled as guesses and do NOT
 * count toward the reachability rate.
 *
 * Honest rate math:
 *   rate = (verified email OR direct LinkedIn profile) / total
 *   searchOnly = search LinkedIn links with no verified email / direct profile
 *   Pattern emails never count.
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

function isDirectLinkedInUrl(url) {
  if (!url || typeof url !== 'string') return false
  const u = url.toLowerCase()
  if (u.includes('/search/')) return false
  // Profile-style LinkedIn URLs only
  return /linkedin\.com\/(in|pub|company)\//i.test(u)
}

/**
 * Build reachability for a Discover/Flow company row.
 *
 * Addresses are facts: only verified emails ever appear. Pattern-guessed
 * addresses are banned from output entirely — drafting outreach is the
 * product's answer, guessing addresses is not (see docs/rebuild-plan.md).
 * @returns {{ reachable: boolean, channels: string[], founders: object[], score: number, directReach: boolean, searchOnly: boolean }}
 */
export function buildReachability(company) {
  const founders = splitFounders(company?.personName)
  const domain = normalizeDomain(company?.domain || company?.url)
  const verifiedEmails = Array.isArray(company?.founderEmails) ? company.founderEmails.filter(Boolean) : []
  const verifiedLinkedIn = Array.isArray(company?.linkedinUrls)
    ? company.linkedinUrls.filter(u => isDirectLinkedInUrl(u))
    : []

  const founderRows = founders.map((name, i) => {
    const emails = verifiedEmails
    const direct = verifiedLinkedIn[i] || null
    const linkedin = direct || linkedInSearchUrl(name, company?.name)
    return {
      name,
      emails,
      emailConfidence: emails.length ? 'verified' : null,
      linkedinUrl: linkedin,
      linkedinKind: direct ? 'profile' : 'search',
    }
  })

  const hasEmail = verifiedEmails.length > 0
  const hasDirectLinkedIn = verifiedLinkedIn.length > 0
    || founderRows.some(f => f.linkedinKind === 'profile')
  const hasSearchLinkedIn = !hasDirectLinkedIn && founderRows.some(f => f.linkedinKind === 'search')
  const channels = []
  if (hasDirectLinkedIn) channels.push('linkedin')
  else if (hasSearchLinkedIn) channels.push('linkedin_search')
  if (hasEmail) channels.push('email')
  if (domain) channels.push('website')

  // Direct reach = verified email OR direct (non-search) LinkedIn — the only
  // paths that count toward the published rate.
  const directReach = Boolean(hasEmail || hasDirectLinkedIn)
  // Search-only = search LinkedIn with no verified email / direct profile.
  const searchOnly = Boolean(hasSearchLinkedIn && !directReach)
  // Broader "has an outreach path" for UI (includes search + website).
  const founderReach = Boolean(founders.length && (hasDirectLinkedIn || hasEmail || hasSearchLinkedIn))
  const reachable = Boolean(directReach || searchOnly || domain)

  let score = 0
  if (founders.length) score += 20
  if (hasDirectLinkedIn) score += 40
  else if (hasSearchLinkedIn) score += 10
  if (hasEmail) score += 30
  if (domain) score += 10

  return {
    reachable,
    founderReach,
    directReach,
    searchOnly,
    channels,
    founders: founderRows,
    score,
    primaryEmail: verifiedEmails[0] || null,
    primaryLinkedIn: founderRows.find(f => f.linkedinKind === 'profile')?.linkedinUrl
      || founderRows[0]?.linkedinUrl
      || verifiedLinkedIn[0]
      || null,
    website: domain ? `https://${domain}` : null,
  }
}

export function annotateReachability(companies = []) {
  return companies.map((c) => {
    const reach = buildReachability(c)
    return { ...c, reach }
  })
}

/**
 * Honest summary: rate counts ONLY verified emails + direct LinkedIn.
 * Search links are reported separately as searchOnly.
 */
export function reachabilitySummary(companies = []) {
  const list = companies || []
  const direct = list.filter(c => c.reach?.directReach).length
  const searchOnly = list.filter(c => c.reach?.searchOnly).length
  const reachable = list.filter(c => c.reach?.reachable).length
  const founderReach = list.filter(c => c.reach?.founderReach).length
  return {
    total: list.length,
    reachable,
    founderReach,
    direct,
    searchOnly,
    // Published rate: verified email OR direct LinkedIn only.
    rate: list.length ? direct / list.length : 0,
    founderRate: list.length ? direct / list.length : 0,
    searchOnlyRate: list.length ? searchOnly / list.length : 0,
  }
}
