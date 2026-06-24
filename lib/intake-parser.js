import { extractDomain, normalizeUrl } from '@/lib/url-utils'

const FUND_DOMAIN_HINTS = /(?:^|\.)((?:vc|ventures?|capital|partners?|fund|investments?|holdings?))(?:\.|$)/i
const URL_RE = /https?:\/\/[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?/gi

function firstUrl(text) {
  const match = text.match(URL_RE)
  if (!match?.[0]) return null
  return normalizeUrl(match[0])
}

function looksLikeFundUrl(url) {
  const domain = extractDomain(url)
  if (!domain) return false
  if (FUND_DOMAIN_HINTS.test(domain)) return true
  return /(?:fund|capital|ventures|partners|invest)/i.test(domain)
}

function looksLikeCompanyUrl(url) {
  const domain = extractDomain(url)
  if (!domain) return false
  return !looksLikeFundUrl(url)
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { q = !q; continue }
    if (c === ',' && !q) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  out.push(cur.trim())
  return out
}

function parseCsvPortfolio(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return null

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const nameIdx = headers.findIndex(h => ['name', 'company', 'portco', 'organization'].includes(h))
  const domainIdx = headers.findIndex(h => ['domain', 'website', 'url', 'site'].includes(h))
  const descIdx = headers.findIndex(h => ['description', 'desc', 'notes', 'sector', 'tagline'].includes(h))
  if (nameIdx < 0 && domainIdx < 0) return null

  const rows = []
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line)
    const name = nameIdx >= 0 ? cols[nameIdx] : ''
    const domainRaw = domainIdx >= 0 ? cols[domainIdx] : ''
    const domain = extractDomain(domainRaw || name)
    if (!name && !domain) continue
    rows.push({
      name: name || domain,
      domain,
      description: descIdx >= 0 ? cols[descIdx] : '',
    })
  }
  return rows.length ? rows : null
}

function parseLineList(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const url = firstUrl(trimmed)
    if (url) {
      const domain = extractDomain(url)
      rows.push({ name: domain, domain, url, description: '' })
      continue
    }

    const parts = trimmed.split(/[|\t,;]+/).map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      rows.push({
        name: parts[0],
        domain: extractDomain(parts[1]) || parts[1],
        description: parts[2] || '',
      })
    } else if (parts.length === 1) {
      rows.push({ name: parts[0], domain: '', description: '' })
    }
  }
  return rows.length ? rows : null
}

function parseVcard(text) {
  const rows = []
  const blocks = text.split(/BEGIN:VCARD/i).slice(1)
  for (const block of blocks) {
    const fn = block.match(/^FN[^:]*:(.+)$/im)?.[1]?.trim()
    const org = block.match(/^ORG[^:]*:(.+)$/im)?.[1]?.trim()
    const url = block.match(/^URL[^:]*:(.+)$/im)?.[1]?.trim()
    const name = org || fn
    if (!name) continue
    rows.push({
      name,
      domain: url ? extractDomain(url) : '',
      url: url ? normalizeUrl(url) : '',
      description: fn && org ? fn : '',
      source: 'contacts',
    })
  }
  return rows.length ? rows : null
}

function guessFundNameFromUrl(url) {
  const domain = extractDomain(url)
  if (!domain) return ''
  const slug = domain.split('.')[0]
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Parse pasted or dropped text/files into structured intake.
 * @returns {{ kind: string, fundUrl?: string, companyUrls?: string[], thesis?: string, portfolio?: object[], pipeline?: object[] }}
 */
export function parseIntakeText(text, { filename = '' } = {}) {
  const trimmed = text?.trim()
  if (!trimmed) return { kind: 'empty' }

  const lowerName = filename.toLowerCase()
  if (lowerName.endsWith('.vcf') || trimmed.includes('BEGIN:VCARD')) {
    const pipeline = parseVcard(trimmed)
    if (pipeline) return { kind: 'pipeline', pipeline }
  }

  if (lowerName.endsWith('.csv') || (trimmed.includes(',') && trimmed.split('\n').length > 1)) {
    const portfolio = parseCsvPortfolio(trimmed)
    if (portfolio) return { kind: 'portfolio', portfolio }
  }

  const urls = [...trimmed.matchAll(URL_RE)].map(m => normalizeUrl(m[0])).filter(Boolean)
  const uniqueUrls = [...new Set(urls)]

  if (uniqueUrls.length === 1) {
    const url = uniqueUrls[0]
    if (looksLikeFundUrl(url)) return { kind: 'fund_url', fundUrl: url, fundName: guessFundNameFromUrl(url) }
    if (looksLikeCompanyUrl(url)) return { kind: 'company_url', companyUrls: [url] }
  }

  if (uniqueUrls.length > 1) {
    const fundUrls = uniqueUrls.filter(looksLikeFundUrl)
    const companyUrls = uniqueUrls.filter(u => !looksLikeFundUrl(u))
    if (fundUrls.length === 1 && companyUrls.length === 0) {
      return { kind: 'fund_url', fundUrl: fundUrls[0], fundName: guessFundNameFromUrl(fundUrls[0]) }
    }
    if (companyUrls.length) return { kind: 'company_urls', companyUrls }
  }

  const linePortfolio = parseLineList(trimmed)
  if (linePortfolio?.length >= 2 && linePortfolio.every(r => r.domain || r.name)) {
    const allHaveUrl = linePortfolio.every(r => r.url || r.domain)
    if (allHaveUrl && linePortfolio.length >= 2) {
      return { kind: 'pipeline', pipeline: linePortfolio }
    }
    return { kind: 'portfolio', portfolio: linePortfolio }
  }

  if (trimmed.length > 12 && !trimmed.includes('\n')) {
    return { kind: 'thesis', thesis: trimmed }
  }

  if (trimmed.length > 20) {
    return { kind: 'thesis', thesis: trimmed }
  }

  return { kind: 'unknown', raw: trimmed }
}

export async function parseIntakeFile(file) {
  const text = await file.text()
  return parseIntakeText(text, { filename: file.name })
}

export { looksLikeFundUrl, looksLikeCompanyUrl, guessFundNameFromUrl }
