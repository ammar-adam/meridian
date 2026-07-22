/**
 * Heuristic parse of Sonar prose into {name, domain?, why?} candidates.
 * Scout results are always unverified — this never assigns trust labels.
 */
export function parseScoutCandidates(text) {
  const out = []
  const seen = new Set()
  const lines = String(text || '').split(/\n+/)

  for (const line of lines) {
    const cleaned = line.replace(/^[-*•\d.)\s]+/, '').trim()
    if (cleaned.length < 4 || cleaned.length > 300) continue

    const domainMatch = cleaned.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i)
    let domain = domainMatch ? domainMatch[1].toLowerCase().replace(/^www\./, '') : null
    if (domain && /^(https?|www)$/i.test(domain)) domain = null

    let namePart = cleaned.split(/\s+[—–-]\s+|:\s+/)[0]
    namePart = namePart.replace(/\([^)]*\)/g, '').trim()
    namePart = namePart.replace(/^\*+|\*+$/g, '').replace(/^_+|_+$/g, '').trim()

    if (!/^[A-Z0-9]/.test(namePart)) continue
    if (/\b(startups?|companies|announced|launched|matching|return)\b/i.test(namePart) && namePart.split(/\s+/).length > 4) continue

    const name = namePart.slice(0, 80)
    if (name.length < 2) continue
    const key = `${name.toLowerCase()}|${domain || ''}`
    if (seen.has(key)) continue
    seen.add(key)

    const why = cleaned.slice(namePart.length).replace(/^[\s—–\-:()]+/, '').slice(0, 160) || null
    out.push({ name, domain, why, heuristic: true })
    if (out.length >= 15) break
  }
  return out
}
