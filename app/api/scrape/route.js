function normalizeUrl(url) {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

export async function POST(req) {
  const { url: rawUrl } = await req.json()
  const url = normalizeUrl(rawUrl)

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 })
  }

  let html = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Meridian/1.0)' },
    })
    if (!res.ok) {
      return Response.json({ error: `Failed to fetch URL (${res.status})` }, { status: 400 })
    }
    html = await res.text()
  } catch {
    return Response.json({ error: 'Failed to fetch URL' }, { status: 400 })
  }

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

  console.log('[scrape]', url, result)

  return Response.json(result)
}
