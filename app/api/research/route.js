import { MODELS } from '@/lib/api-models'
import { enforceRateLimit } from '@/lib/api-guard'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/server-cache'
import { extractDomain } from '@/lib/url-utils'

export const maxDuration = 300

export async function POST(req) {
  const limited = enforceRateLimit(req, 'research')
  if (limited) return limited

  const { url, forceRegenerate, researchMode } = await req.json()

  if (!process.env.PERPLEXITY_API_KEY) {
    return Response.json({ error: 'PERPLEXITY_API_KEY is not configured' }, { status: 500 })
  }

  const domain = extractDomain(url)
  const cacheKey = `research:${domain}`

  if (!forceRegenerate && domain) {
    const cached = await cacheGet(cacheKey)
    if (cached) {
      console.log('[research] cache hit', domain)
      return Response.json({ research: cached, cached: true })
    }
  }

  const quick = researchMode === 'quick'
  const model = quick ? MODELS.perplexitySearch : MODELS.perplexityResearch

  const query = quick
    ? `Research ${url}. Return: product summary, market size, funding stage and total raised, lead investors, founding team names, 2–3 defensibility points, recent news. Be specific with numbers.`
    : `
    Research the company at ${url}.
    Return detailed information about:
    1. What the product does, in plain english, including specific features
    2. The market they operate in: size, growth, tailwinds, customer types
    3. The founding team: names, roles, previous companies, notable exits or backgrounds
    4. Funding history: total raised, latest round size, round stage, lead investors, date
    5. Competitive defensibility: what makes them hard to replicate, data moats, switching costs
    6. Recent news or notable milestones in the last 12 months
    Be specific with numbers wherever possible. Do not generalize.
  `

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: query }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[research] Perplexity error:', err)
    return Response.json({ error: 'Perplexity API request failed' }, { status: 500 })
  }

  const data = await res.json()
  const research = data.choices?.[0]?.message?.content ?? ''

  if (domain && research) {
    await cacheSet(cacheKey, research, CACHE_TTL.research)
  }

  console.log('[research]', url, `${research.length} chars`)

  return Response.json({ research, cached: false })
}
