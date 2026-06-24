export function normalizeUrl(url) {
  if (!url?.trim()) return null
  let normalized = url.trim()
  if (!normalized.startsWith('http')) normalized = `https://${normalized}`
  return normalized.replace(/\/+$/, '')
}

export function extractDomain(urlOrDomain) {
  if (!urlOrDomain?.trim()) return ''
  const raw = urlOrDomain.trim()
  try {
    const u = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return raw.replace(/^www\./, '').split('/')[0].toLowerCase()
  }
}
