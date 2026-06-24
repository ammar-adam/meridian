import { FUND_ENRICH_SYSTEM, buildFundEnrichMessage } from '@/lib/fund-enrich-prompt'
import { MODELS } from '@/lib/api-models'
import { callAnthropic } from '@/lib/anthropic'
import { enforceRateLimit } from '@/lib/api-guard'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/server-cache'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'

export const maxDuration = 120

async function scrapeUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Meridian/1.0)' },
  })
  if (!res.ok) throw new Error(`Failed to fetch fund website (${res.status})`)
  const html = await res.text()
  const get = (pattern) => html.match(pattern)?.[1] ?? ''
  const ogTitle = get(/property="og:title"\s+content="([^"]+)"/) ||
                  get(/content="([^"]+)"\s+property="og:title"/)
  const ogDescription = get(/property="og:description"\s+content="([^"]+)"/) ||
                        get(/content="([^"]+)"\s+property="og:description"/)
  const base = new URL(url)
  return { ogTitle, ogDescription, domain: base.hostname }
}

export async function POST(req) {
  const limited = enforceRateLimit(req, 'fundEnrich')
  if (limited) return limited

  const { fundName, fundWebsiteUrl, forceRegenerate } = await req.json()

  if (!fundName?.trim() || !fundWebsiteUrl?.trim()) {
    return Response.json({ error: 'Fund name and website URL are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const url = normalizeUrl(fundWebsiteUrl)
  if (!url) {
    return Response.json({ error: 'Invalid website URL' }, { status: 400 })
  }

  const domain = extractDomain(url)
  const cacheKey = `fund-enrich:${domain}`

  if (!forceRegenerate && domain) {
    const cached = await cacheGet(cacheKey)
    if (cached?.draft) {
      console.log('[fund-enrich] cache hit', domain)
      return Response.json({ ...cached, cached: true })
    }
  }

  let scraped
  try {
    scraped = await scrapeUrl(url)
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to scrape fund website' }, { status: 400 })
  }

  let research = ''
  if (process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY !== 'your_key_here') {
    const query = `${fundName} venture capital fund investment thesis portfolio companies recent investments ${new Date().getFullYear()}`
    const pRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.perplexitySearch,
        messages: [{ role: 'user', content: query }],
      }),
    })
    if (pRes.ok) {
      const pData = await pRes.json()
      research = pData.choices?.[0]?.message?.content ?? ''
    }
  }

  let raw
  try {
    const result = await callAnthropic({
      system: FUND_ENRICH_SYSTEM,
      maxTokens: 4000,
      messages: [{ role: 'user', content: buildFundEnrichMessage({ fundName, fundWebsiteUrl: url, scraped, research }) }],
    })
    raw = result.text
  } catch (err) {
    console.error('[fund-enrich] Claude error:', err.message)
    return Response.json({ error: 'Failed to enrich fund profile' }, { status: 500 })
  }

  let draft
  try {
    draft = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]+\}/)
    draft = match ? JSON.parse(match[0]) : null
  }

  if (!draft) {
    return Response.json({ error: 'Failed to parse fund profile' }, { status: 500 })
  }

  const payload = {
    draft: {
      fundName: draft.fundName || fundName,
      fundWebsiteUrl: url,
      thesis: draft.thesis || '',
      portfolio: draft.portfolio || [],
      mandate: draft.mandate || { stages: [], geographies: [], sectors: [] },
      thesisInstructions: draft.thesisInstructions || '',
    },
  }

  if (domain) {
    await cacheSet(cacheKey, payload, CACHE_TTL.fundEnrich)
  }

  return Response.json({ ...payload, cached: false })
}
