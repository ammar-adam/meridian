import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/server-cache'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'

export async function runScrape(rawUrl, { forceRegenerate = false } = {}) {
  const url = normalizeUrl(rawUrl)
  if (!url) throw new Error('URL is required')

  const domain = extractDomain(url)
  const cacheKey = `scrape:${domain}`

  if (!forceRegenerate && domain) {
    const cached = await cacheGet(cacheKey)
    if (cached) return { ...cached, cached: true }
  }

  let html = ''
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Meridian/1.0)' },
  })
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`)
  html = await res.text()

  const get = (pattern) => html.match(pattern)?.[1] ?? ''

  const ogImage = get(/property="og:image"\s+content="([^"]+)"/) ||
                  get(/content="([^"]+)"\s+property="og:image"/)
  const ogTitle = get(/property="og:title"\s+content="([^"]+)"/) ||
                  get(/content="([^"]+)"\s+property="og:title"/)
  const ogDescription = get(/property="og:description"\s+content="([^"]+)"/) ||
                        get(/content="([^"]+)"\s+property="og:description"/)
  const favicon = get(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/) ||
                  get(/<link[^>]+href="([^"]+)"[^>]+rel="icon"/)

  const base = new URL(url)
  const resolveUrl = (u) => {
    if (!u) return ''
    try { return new URL(u, base).href } catch { return u }
  }

  const result = {
    ogImage: resolveUrl(ogImage),
    ogTitle,
    ogDescription,
    favicon: resolveUrl(favicon),
    domain: base.hostname,
  }

  if (domain) await cacheSet(cacheKey, result, CACHE_TTL.scrape)
  return { ...result, cached: false }
}
