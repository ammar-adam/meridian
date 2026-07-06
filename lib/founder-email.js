const PATTERNS = [
  (first, last, domain) => `${first}@${domain}`,
  (first, last, domain) => `${first}.${last}@${domain}`,
  (first, last, domain) => `${first[0]}${last}@${domain}`,
  (first, last, domain) => `${first}${last}@${domain}`,
]

async function checkMxRecord(domain) {
  const dns = await import('node:dns/promises')
  try {
    const records = await dns.resolveMx(domain)
    return records.length > 0
  } catch {
    return false
  }
}

function normalizeDomain(domain) {
  return (domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()
}

export async function guessFounderEmails(founderName, domain) {
  const cleanDomain = normalizeDomain(domain)
  const parts = (founderName || '').toLowerCase().trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.replace(/[^a-z]/g, '')
  const last = parts[parts.length - 1]?.replace(/[^a-z]/g, '')
  if (!first || !last || first === last || !cleanDomain.includes('.')) return []

  const candidates = [...new Set(PATTERNS.map(p => p(first, last, cleanDomain)))]
  const hasMx = await checkMxRecord(cleanDomain)

  return candidates.map(email => ({
    email,
    confidence: hasMx ? 'pattern-matched, domain verified' : 'pattern-matched, unverified domain',
  }))
}
