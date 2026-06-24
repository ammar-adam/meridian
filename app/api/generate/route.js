import { buildSystemPrompt } from '@/lib/system-prompt'
import { runQualityGate } from '@/lib/quality-gate'
import { normalizePortfolio } from '@/lib/fund-profile'
import { callAnthropic, textBlock } from '@/lib/anthropic'
import { enforceRateLimit } from '@/lib/api-guard'
import { cacheGet, cacheSet, CACHE_TTL, stableHash } from '@/lib/server-cache'
import { formatLearningBlock } from '@/lib/learning-context'
import { extractDomain } from '@/lib/url-utils'

export const maxDuration = 120

const INDUSTRY_IMAGES = {
  fintech: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
  health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
  enterprise: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  government: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
}

function portfolioText(fundContext) {
  const companies = normalizePortfolio(fundContext.portfolio)
  if (companies.length === 0) return 'None listed'
  return companies.map(c => `${c.name} (${c.description || c.domain || ''})`).join(', ')
}

function generateCacheKey(scraped, fundContext, sourceContext, learningContext) {
  const domain = scraped?.domain || extractDomain(scraped?.domain)
  const sourceKey = sourceContext
    ? stableHash({
        thesis: sourceContext.thesis,
        fitScore: sourceContext.fitScore,
        rationale: sourceContext.rationale,
      })
    : 'none'
  const learnKey = learningContext
    ? stableHash({
        pursued: learningContext.pursued,
        corrections: learningContext.thesisCorrections?.length,
      })
    : 'none'
  return `generate:${domain}:${fundContext.id || fundContext.fundName}:${fundContext.strategyId || 'default'}:${sourceKey}:${learnKey}`
}

export async function POST(req) {
  const limited = enforceRateLimit(req, 'generate')
  if (limited) return limited

  const { research, scraped, fundContext, sourceContext, learningContext, forceRegenerate } = await req.json()

  if (!fundContext?.fundName) {
    return Response.json({ error: 'Fund profile is required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const cacheKey = generateCacheKey(scraped, fundContext, sourceContext, learningContext)

  if (!forceRegenerate) {
    const cached = await cacheGet(cacheKey)
    if (cached?.memoData) {
      console.log('[generate] cache hit', scraped?.domain)
      return Response.json({ ...cached, cached: true })
    }
  }

  const sourceBlock = sourceContext ? `
This company was surfaced from an active sourcing search.

Search thesis: ${sourceContext.thesis || ''}
Fit score: ${sourceContext.fitScore ?? 'N/A'}
Sourcing rationale: ${sourceContext.rationale || ''}

The thesis band must explain why this company is worth a conversation given
this specific search context and the fund's mandate.
` : ''

  const fundBlock = `
The fund reviewing this deal is: ${fundContext.fundName}

Fund thesis:
${fundContext.thesis}

Portfolio companies:
${portfolioText(fundContext)}

Thesis writing instructions:
${fundContext.thesisInstructions}
${learningContext ? `\n${formatLearningBlock(learningContext)}` : ''}
`

  const companyBlock = `
Here is the raw research on the company:

${research}

Here is additional data scraped from their website:
- Title: ${scraped.ogTitle}
- Description: ${scraped.ogDescription}
- Domain: ${scraped.domain}
${sourceBlock}
Generate the memo JSON now.
`

  let raw
  try {
    const result = await callAnthropic({
      system: buildSystemPrompt(fundContext),
      maxTokens: 4000,
      messages: [{
        role: 'user',
        content: [
          textBlock(fundBlock, { cache: true }),
          textBlock(companyBlock),
        ],
      }],
    })
    raw = result.text
  } catch (err) {
    console.error('[generate] Anthropic error:', err.message)
    return Response.json({ error: 'Claude API request failed' }, { status: 500 })
  }

  let memoData
  try {
    memoData = JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]+\}/)
    memoData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  }

  if (!memoData) {
    return Response.json({ error: 'Failed to parse Claude response' }, { status: 500 })
  }

  memoData.FUND_NAME = fundContext.fundFooterName || fundContext.fundName
  memoData.FUND_LOGO_URL = fundContext.fundLogoUrl || ''
  memoData.COMPANY_LOGO_URL = scraped.favicon || ''

  const industryTag = memoData.INDUSTRY_TAG || 'default'
  const heroUrl = scraped.ogImage || INDUSTRY_IMAGES[industryTag] || INDUSTRY_IMAGES.default
  memoData.HERO_IMAGE_URL = heroUrl

  delete memoData.INDUSTRY_TAG

  const qualityGate = runQualityGate(memoData, fundContext)

  if (!qualityGate.passed) {
    const errors = qualityGate.flags.filter(f => f.severity === 'error')
    try {
      const repair = await callAnthropic({
        system: 'You fix investment memo JSON. Return ONLY valid JSON with all 48 keys. Fix the listed errors. Use Undisclosed for unknown facts — never invent people or numbers.',
        maxTokens: 4000,
        messages: [{
          role: 'user',
          content: `Fix this memo JSON.\n\nErrors:\n${errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}\n\nJSON:\n${JSON.stringify(memoData)}`,
        }],
      })
      let repaired
      try {
        repaired = JSON.parse(repair.text)
      } catch {
        const m = repair.text.match(/\{[\s\S]+\}/)
        repaired = m ? JSON.parse(m[0]) : null
      }
      if (repaired) {
        repaired.FUND_NAME = memoData.FUND_NAME
        repaired.FUND_LOGO_URL = memoData.FUND_LOGO_URL
        repaired.COMPANY_LOGO_URL = memoData.COMPANY_LOGO_URL
        repaired.HERO_IMAGE_URL = memoData.HERO_IMAGE_URL
        memoData = repaired
        const retryQg = runQualityGate(memoData, fundContext)
        if (retryQg.passed || retryQg.flags.filter(f => f.severity === 'error').length < errors.length) {
          Object.assign(qualityGate, retryQg)
        }
      }
    } catch (repairErr) {
      console.warn('[generate] repair pass failed:', repairErr.message)
    }
  }

  console.log('[generate] memo for', memoData.COMPANY_NAME, 'qg:', qualityGate.passed)

  const payload = { memoData, qualityGate }

  if (qualityGate.passed) {
    await cacheSet(cacheKey, payload, CACHE_TTL.generate)
  }

  return Response.json({ ...payload, cached: false })
}
