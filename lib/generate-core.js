import { buildSystemPrompt } from '@/lib/system-prompt'
import { runQualityGate } from '@/lib/quality-gate'
import { normalizePortfolio } from '@/lib/fund-profile'
import { callAnthropic, textBlock } from '@/lib/anthropic'
import { MODELS } from '@/lib/api-models'
import { cacheGet, cacheSet, CACHE_TTL, stableHash } from '@/lib/server-cache'
import { formatLearningBlock } from '@/lib/learning-context'
import { extractDomain } from '@/lib/url-utils'

const INDUSTRY_IMAGES = {
  fintech: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
  health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
  enterprise: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  government: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
}

const THESIS_KEYS = [
  'FUND_ANGLE_LABEL',
  'THESIS_HEADLINE',
  'THESIS_1_TITLE',
  'THESIS_1_TEXT',
  'THESIS_2_TITLE',
  'THESIS_2_TEXT',
  'THESIS_3_TITLE',
  'THESIS_3_TEXT',
  'PORTFOLIO_INTRO',
  'PORTFOLIO_ITEMS',
]

const GENERATE_MAX_TOKENS = 2500

function portfolioText(fundContext) {
  const companies = normalizePortfolio(fundContext.portfolio)
  if (companies.length === 0) return 'None listed'
  return companies.map(c => `${c.name} (${c.description || c.domain || ''})`).join(', ')
}

function generateCacheKey(scraped, fundContext, sourceContext, learningContext, researchMode) {
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
  return `generate:${domain}:${fundContext.id || fundContext.fundName}:${fundContext.strategyId || 'default'}:${researchMode}:${sourceKey}:${learnKey}`
}

function parseMemoJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]+\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null
  }
}

async function upgradeThesisBand(memoData, {
  research,
  scraped,
  fundContext,
  sourceContext,
  learningContext,
}) {
  const sourceBlock = sourceContext
    ? `\nSourcing context: ${sourceContext.thesis || ''} (fit ${sourceContext.fitScore ?? 'N/A'})`
    : ''

  const result = await callAnthropic({
    model: MODELS.claude,
    system: `You are a GP at ${fundContext.fundName}. Return ONLY valid JSON with these keys: ${THESIS_KEYS.join(', ')}. Reference specific portfolio companies. No markdown fences.`,
    maxTokens: 1500,
    cacheSystem: false,
    messages: [{
      role: 'user',
      content: `Upgrade the thesis band for ${memoData.COMPANY_NAME}.

Fund thesis:
${fundContext.thesis}

Portfolio: ${portfolioText(fundContext)}
${learningContext ? formatLearningBlock(learningContext) : ''}
${sourceBlock}

Research:
${research}

Website: ${scraped.ogTitle} — ${scraped.ogDescription}

Draft product summary:
${memoData.PRODUCT_DESCRIPTION}`,
    }],
  })

  const patch = parseMemoJson(result.text)
  if (!patch) return memoData
  for (const key of THESIS_KEYS) {
    if (patch[key]) memoData[key] = patch[key]
  }
  return memoData
}

export async function runGenerate({
  research,
  scraped,
  fundContext,
  sourceContext,
  learningContext,
  forceRegenerate = false,
  researchMode = 'auto',
}) {
  if (!fundContext?.fundName) throw new Error('Fund profile is required')
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured')

  const cacheKey = generateCacheKey(scraped, fundContext, sourceContext, learningContext, researchMode)
  const skipRepair = researchMode !== 'deep'
  const useFastDraft = researchMode !== 'deep'

  if (!forceRegenerate) {
    const cached = await cacheGet(cacheKey)
    if (cached?.memoData) return { ...cached, cached: true }
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

  const draftModel = useFastDraft ? MODELS.claudeFast : MODELS.claude
  const draftPayload = {
    system: buildSystemPrompt(fundContext),
    maxTokens: GENERATE_MAX_TOKENS,
    messages: [{
      role: 'user',
      content: [
        textBlock(fundBlock, { cache: true }),
        textBlock(companyBlock),
      ],
    }],
  }

  let raw
  try {
    const result = await callAnthropic({ model: draftModel, ...draftPayload })
    raw = result.text
  } catch (err) {
    if (draftModel !== MODELS.claude) {
      console.warn('[generate] fast model failed, falling back to sonnet:', err.message)
      try {
        const fallback = await callAnthropic({ model: MODELS.claude, ...draftPayload })
        raw = fallback.text
      } catch (fallbackErr) {
        console.error('[generate] Anthropic error:', fallbackErr.message)
        throw fallbackErr
      }
    } else {
      console.error('[generate] Anthropic error:', err.message)
      throw err
    }
  }

  let memoData = parseMemoJson(raw)
  if (!memoData) throw new Error('Failed to parse Claude response')

  memoData.FUND_NAME = fundContext.fundFooterName || fundContext.fundName
  memoData.FUND_LOGO_URL = fundContext.fundLogoUrl || ''
  memoData.COMPANY_LOGO_URL = scraped.favicon || ''

  const industryTag = memoData.INDUSTRY_TAG || 'default'
  const heroUrl = scraped.ogImage || INDUSTRY_IMAGES[industryTag] || INDUSTRY_IMAGES.default
  memoData.HERO_IMAGE_URL = heroUrl
  delete memoData.INDUSTRY_TAG

  if (useFastDraft) {
    try {
      memoData = await upgradeThesisBand(memoData, {
        research,
        scraped,
        fundContext,
        sourceContext,
        learningContext,
      })
    } catch (upgradeErr) {
      console.warn('[generate] thesis upgrade failed:', upgradeErr.message)
    }
  }

  let qualityGate = runQualityGate(memoData, fundContext, { researchMode })

  if (!qualityGate.passed && !skipRepair) {
    const errors = qualityGate.flags.filter(f => f.severity === 'error')
    try {
      const repair = await callAnthropic({
        model: MODELS.claude,
        system: 'You fix investment memo JSON. Return ONLY valid JSON with all 48 keys. Fix the listed errors. Use Undisclosed for unknown facts — never invent people or numbers.',
        maxTokens: GENERATE_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: `Fix this memo JSON.\n\nErrors:\n${errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}\n\nJSON:\n${JSON.stringify(memoData)}`,
        }],
      })
      const repaired = parseMemoJson(repair.text)
      if (repaired) {
        repaired.FUND_NAME = memoData.FUND_NAME
        repaired.FUND_LOGO_URL = memoData.FUND_LOGO_URL
        repaired.COMPANY_LOGO_URL = memoData.COMPANY_LOGO_URL
        repaired.HERO_IMAGE_URL = memoData.HERO_IMAGE_URL
        memoData = repaired
        const retryQg = runQualityGate(memoData, fundContext, { researchMode })
        if (retryQg.passed || retryQg.flags.filter(f => f.severity === 'error').length < errors.length) {
          qualityGate = retryQg
        }
      }
    } catch (repairErr) {
      console.warn('[generate] repair pass failed:', repairErr.message)
    }
  }

  const payload = { memoData, qualityGate }
  if (qualityGate.passed) await cacheSet(cacheKey, payload, CACHE_TTL.generate)
  return { ...payload, cached: false }
}
