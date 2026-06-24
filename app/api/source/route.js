import { parseThesis } from '@/lib/thesis-parser'
import { searchPitchbook } from '@/lib/pitchbook'
import { SOURCE_RANK_PROMPT, buildRankUserBlocks } from '@/lib/source-prompt'
import { MODELS } from '@/lib/api-models'
import { callAnthropic, textBlock } from '@/lib/anthropic'
import { enforceRateLimit } from '@/lib/api-guard'
import { cacheGet, cacheSet, CACHE_TTL, stableHash } from '@/lib/server-cache'

export const maxDuration = 300

function sourceCacheKey(thesis, fundContext) {
  return `source:${stableHash({
    thesis: thesis.trim().toLowerCase(),
    fundId: fundContext.id,
    strategyId: fundContext.strategyId,
  })}`
}

export async function POST(req) {
  const limited = enforceRateLimit(req, 'source')
  if (limited) return limited

  const { thesis, fundContext, forceRegenerate } = await req.json()

  if (!thesis?.trim()) {
    return Response.json({ error: 'Thesis is required' }, { status: 400 })
  }

  if (!fundContext?.fundName) {
    return Response.json({ error: 'Configure your fund profile before sourcing' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  if (!process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY === 'your_key_here') {
    return Response.json({ error: 'PERPLEXITY_API_KEY is not configured' }, { status: 500 })
  }

  const cacheKey = sourceCacheKey(thesis, fundContext)
  if (!forceRegenerate) {
    const cached = await cacheGet(cacheKey)
    if (cached?.companies) {
      console.log('[source] cache hit', thesis.slice(0, 40))
      return Response.json({ ...cached, cached: true })
    }
  }

  const year = new Date().getFullYear()

  let parsed
  try {
    parsed = await parseThesis(thesis, process.env.ANTHROPIC_API_KEY, fundContext)
  } catch {
    parsed = {
      sectors: fundContext.mandate?.sectors || [],
      stages: fundContext.mandate?.stages?.length ? fundContext.mandate.stages : ['Series A'],
      geographies: fundContext.mandate?.geographies?.length ? fundContext.mandate.geographies : ['North America'],
      keywords: thesis.split(/[,\s]+/).filter(Boolean).slice(0, 5),
      pitchbookQuery: thesis,
      perplexityQuery: `${thesis} startups seed Series A ${year}`,
    }
  }

  if (!parsed) {
    return Response.json({ error: 'Failed to parse thesis' }, { status: 500 })
  }

  const pitchbookResults = await searchPitchbook(parsed)

  const perplexityQuery = parsed.perplexityQuery ?? `
    Find companies matching this investment thesis: ${thesis}
    Fund mandate: ${fundContext.thesis}
    Focus on: ${parsed.stages?.join(', ') ?? 'Series A'} stage companies in ${parsed.geographies?.join(', ') ?? 'North America'}.
    Sectors: ${parsed.sectors?.join(', ') ?? 'as described'}.
    Year: ${year}.
    For each company return: name, website domain, one-line description, funding stage, total raised, lead investors, HQ geography.
    List at least 15 specific companies with real names and domains.
  `

  const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELS.perplexitySearch,
      messages: [{ role: 'user', content: perplexityQuery }],
    }),
  })

  if (!perplexityRes.ok) {
    const err = await perplexityRes.text()
    console.error('[source] Perplexity error:', err)
    return Response.json({ error: 'Perplexity search failed' }, { status: 500 })
  }

  const perplexityData = await perplexityRes.json()
  const perplexityResearch = perplexityData.choices?.[0]?.message?.content ?? ''

  const rankBlocks = buildRankUserBlocks(thesis, parsed, pitchbookResults, perplexityResearch, fundContext)

  let raw
  try {
    const result = await callAnthropic({
      system: SOURCE_RANK_PROMPT,
      maxTokens: 8000,
      messages: [{
        role: 'user',
        content: [
          textBlock(rankBlocks.staticBlock, { cache: rankBlocks.hasFundContext }),
          textBlock(rankBlocks.dynamicBlock),
        ],
      }],
    })
    raw = result.text
  } catch (err) {
    console.error('[source] Claude rank error:', err.message)
    return Response.json({ error: 'Ranking failed' }, { status: 500 })
  }

  let companies
  try {
    companies = JSON.parse(raw)
  } catch {
    const arrMatch = raw.match(/\[[\s\S]+\]/)
    companies = arrMatch ? JSON.parse(arrMatch[0]) : []
  }

  if (!Array.isArray(companies)) {
    return Response.json({ error: 'Failed to parse ranked results' }, { status: 500 })
  }

  companies = companies.map(c => ({
    ...c,
    url: c.url || (c.domain ? `https://${c.domain.replace(/^https?:\/\//, '')}` : ''),
    fitScore: Number(c.fitScore) || 0,
  })).sort((a, b) => b.fitScore - a.fitScore)

  console.log('[source]', thesis.slice(0, 60), `→ ${companies.length} companies (pb: ${pitchbookResults.length})`)

  const payload = {
    companies,
    meta: {
      thesis,
      parsed,
      fundId: fundContext.id,
      pitchbookCount: pitchbookResults.length,
      perplexityChars: perplexityResearch.length,
      pitchbookConfigured: !!(process.env.PITCHBOOK_API_KEY && process.env.PITCHBOOK_API_KEY !== 'your_key_here'),
    },
  }

  await cacheSet(cacheKey, payload, CACHE_TTL.source)

  return Response.json({ ...payload, cached: false })
}
