import { parseThesis } from '@/lib/thesis-parser'
import { searchCompanyDatabase, getDatabaseSearchMeta } from '@/lib/company-search'
import { mergeCompanySeeds, postProcessDiscoverResults, MIN_RESULTS } from '@/lib/discover-merge'
import { SOURCE_RANK_PROMPT, buildRankUserBlocks } from '@/lib/source-prompt'
import { MODELS } from '@/lib/api-models'
import { callAnthropic, textBlock } from '@/lib/anthropic'
import { enforceRateLimit } from '@/lib/api-guard'
import { cacheGet, cacheSet, CACHE_TTL, stableHash } from '@/lib/server-cache'
import {
  buildDiscoverResearchPlan,
  runDiscoverResearch,
  fetchStructuredStealthSignals,
  formatResearchForRanker,
} from '@/lib/discover-research'
import { isCanadianMandate, normalizeGeographies } from '@/lib/geography-utils'
import { evertraceSignalToDiscoverSeed } from '@/lib/evertrace'
import { runSourcingAdapters } from '@/lib/sourcing/run-adapters'

export const maxDuration = 300

function sourceCacheKey(thesis, fundContext) {
  return `source:${stableHash({
    thesis: thesis.trim().toLowerCase(),
    fundId: fundContext.id,
    strategyId: fundContext.strategyId,
  })}`
}

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
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
  const geos = normalizeGeographies(null, fundContext)

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
      perplexityQuery: `List 20+ real startups matching: ${thesis}. For each: company name, website domain, one-line description, funding stage, total raised, lead investors, HQ geography. Year ${year}.`,
    }
  }

  if (!parsed) {
    return Response.json({ error: 'Failed to parse thesis' }, { status: 500 })
  }

  const dbSearch = await searchCompanyDatabase(parsed, thesis, fundContext)
  const { startuphub, pitchbook } = dbSearch
  const structuredStealth = await fetchStructuredStealthSignals(parsed, thesis, fundContext)
  const stealthSeeds = structuredStealth.map(evertraceSignalToDiscoverSeed)
  const sourcing = await runSourcingAdapters({ parsed, thesis, fundContext, resolve: true })
  const mergedSeeds = mergeCompanySeeds(startuphub, pitchbook, stealthSeeds, sourcing.seeds)

  const researchPlans = buildDiscoverResearchPlan(parsed, thesis, fundContext)
  const researchResults = await runDiscoverResearch(researchPlans)
  const perplexityResearch = formatResearchForRanker(researchResults)

  const rankBlocks = buildRankUserBlocks(thesis, parsed, mergedSeeds, perplexityResearch, fundContext)

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
    return Response.json({ error: err.message || 'Ranking failed' }, { status: 500 })
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

  const canadianMandate = isCanadianMandate(parsed?.geographies, fundContext)
  const preferEnrichedIncubators = canadianMandate
    || /canada|waterloo|ontario|toronto|velocity|dmz|cdl/i.test(thesis || '')

  companies = postProcessDiscoverResults(companies, mergedSeeds, { preferEnrichedIncubators })

  const thin = companies.length < MIN_RESULTS
  const canadianCount = companies.filter(c => /canada|toronto|montreal|vancouver|calgary|\.ca/i.test(`${c.geography} ${c.domain}`)).length
  const incubatorCount = companies.filter(c => c.source === 'incubator').length
  // Don't shame the UI with EverTrace when community incubator seeds already dominate.
  const thinCanadian = canadianMandate && canadianCount < 5 && incubatorCount < 3

  console.log(
    '[source]',
    thesis.slice(0, 60),
    `→ ${companies.length} companies (hub: ${startuphub.length}/${dbSearch.startuphubRawCount}, pb: ${pitchbook.length}, stealth: ${stealthSeeds.length}, sourcing: ${sourcing.seeds.length}, incubators: ${incubatorCount}, passes: ${researchResults.map(r => r.id).join('+')}${thin ? ', thin' : ''})`,
  )

  const dbMeta = getDatabaseSearchMeta(dbSearch)

  const payload = {
    companies,
    meta: {
      thesis,
      parsed,
      fundId: fundContext.id,
      ...dbMeta,
      seedCount: mergedSeeds.length,
      stealthSeedCount: stealthSeeds.length,
      sourcing: sourcing.meta,
      researchPasses: researchResults.map(r => ({ id: r.id, label: r.label, ok: r.ok, unverified: !!r.unverified })),
      canadianMandate,
      canadianResultCount: canadianCount,
      incubatorResultCount: incubatorCount,
      thin,
      thinCanadian,
      perplexityChars: perplexityResearch.length,
      pitchbookCount: pitchbook.length,
      pitchbookConfigured: dbMeta.pitchbookConfigured,
    },
  }

  if (!thin) {
    await cacheSet(cacheKey, payload, CACHE_TTL.source)
  }

  return Response.json({ ...payload, cached: false })
}
