import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns/promises'
import { extractDomain } from '@/lib/url-utils'

const TLDS = ['.com', '.ca', '.io', '.co', '.ai']
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function cacheFile() {
  const dir = path.join(process.cwd(), '.cache', 'domain-check')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'dns-results.json')
}

function loadDnsCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(cacheFile(), 'utf8'))
    const now = Date.now()
    const out = {}
    for (const [k, v] of Object.entries(raw || {})) {
      if (v?.at && now - v.at < CACHE_TTL_MS) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function saveDnsCache(cache) {
  try {
    fs.writeFileSync(cacheFile(), JSON.stringify(cache), 'utf8')
  } catch { /* ignore */ }
}

let memoryCache = null
function getCache() {
  if (!memoryCache) memoryCache = loadDnsCache()
  return memoryCache
}

export function slugifyCompanyName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(inc|incorporated|corp|corporation|ltd|limited|ulc|llc|co|company|the)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40)
}

export function candidateDomainsForName(name) {
  const raw = String(name || '')
  const slug = slugifyCompanyName(raw)
  if (!slug || slug.length < 3) return []

  const variants = new Set([slug])
  const noCanada = slug.replace(/canada$/, '')
  if (noCanada.length >= 3) variants.add(noCanada)
  const noDigits = slug.replace(/\d+$/, '')
  if (noDigits.length >= 3) variants.add(noDigits)

  const out = []
  for (const v of variants) {
    for (const tld of TLDS) out.push(`${v}${tld}`)
  }
  return out
}

async function resolvesDns(hostname) {
  try {
    const records = await dns.resolve4(hostname)
    return Array.isArray(records) && records.length > 0
  } catch {
    try {
      const cname = await dns.resolveCname(hostname)
      return Array.isArray(cname) && cname.length > 0
    } catch {
      return false
    }
  }
}

async function httpAlive(hostname) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2500)
  try {
    const res = await fetch(`https://${hostname}`, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'MeridianDomainCheck/1.0' },
    })
    return res.status > 0 && res.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Free domain existence check — DNS + optional HTTP, no paid WHOIS.
 * Caches positive and negative results for 7 days under .cache/domain-check/
 */
export async function checkDomainExists(nameOrDomain) {
  const asDomain = extractDomain(nameOrDomain)
  const candidates = asDomain.includes('.') && !/\s/.test(String(nameOrDomain))
    ? [asDomain]
    : candidateDomainsForName(nameOrDomain)

  const cacheKey = candidates.join('|') || String(nameOrDomain).toLowerCase()
  const cache = getCache()
  if (cache[cacheKey]) {
    const hit = cache[cacheKey]
    return {
      resolves: !!hit.resolves,
      domain: hit.domain || null,
      method: hit.method ? `${hit.method}+cache` : 'cache',
      candidates,
      fromCache: true,
    }
  }

  for (const domain of candidates) {
    const dnsOk = await resolvesDns(domain)
    if (!dnsOk) continue
    const httpOk = await httpAlive(domain)
    const result = {
      resolves: true,
      domain,
      method: httpOk ? 'dns+http' : 'dns',
      candidates,
      fromCache: false,
    }
    cache[cacheKey] = { ...result, at: Date.now() }
    saveDnsCache(cache)
    return result
  }

  const miss = { resolves: false, domain: null, method: null, candidates, fromCache: false }
  cache[cacheKey] = { resolves: false, domain: null, method: null, at: Date.now() }
  saveDnsCache(cache)
  return miss
}

/** Parallel map with concurrency limit */
export async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i], i)
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}
