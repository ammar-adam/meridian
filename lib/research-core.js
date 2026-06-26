import { MODELS } from '@/lib/api-models'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/server-cache'
import { extractDomain } from '@/lib/url-utils'
import { resolveResearchMode } from '@/lib/research-mode'

export async function runResearch(url, { forceRegenerate = false, researchMode = 'quick' } = {}) {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not configured')
  }

  const domain = extractDomain(url)
  const mode = resolveResearchMode(researchMode)
  const cacheKey = `research:${domain}:${mode}`

  if (!forceRegenerate && domain) {
    const cached = await cacheGet(cacheKey)
    if (cached) return { research: cached, cached: true }
  }

  const quick = mode === 'quick'
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
    throw new Error('Perplexity API request failed')
  }

  const data = await res.json()
  const research = data.choices?.[0]?.message?.content ?? ''

  if (domain && research) await cacheSet(cacheKey, research, CACHE_TTL.research)
  return { research, cached: false }
}
