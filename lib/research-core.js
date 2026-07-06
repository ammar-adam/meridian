import { MODELS } from '@/lib/api-models'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/server-cache'
import { extractDomain } from '@/lib/url-utils'
import { resolveResearchMode, resolveEffectiveResearchMode } from '@/lib/research-mode'
import { buildInstantResearch } from '@/lib/instant-research'
import {
  buildResearchPasses,
  selectPassesForMode,
  assessConfidence,
  buildTeamEscalationQuery,
  mergePassesToLegacyString,
  mergeTeamEscalation,
} from '@/lib/research-passes'

export { buildInstantResearch }

function effectiveMode(researchMode, scraped) {
  const mode = resolveResearchMode(researchMode)
  if (mode === 'auto') {
    return scraped ? resolveEffectiveResearchMode('auto', scraped) : 'quick'
  }
  return mode
}

function modelForMode(mode) {
  return mode === 'deep' ? MODELS.perplexityResearch : MODELS.perplexitySearch
}

async function runPerplexityQuery(query, model) {
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
    console.error('[research] Perplexity error:', err.slice(0, 200))
    throw new Error('Perplexity API request failed')
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function runPass(pass, model) {
  const content = await runPerplexityQuery(pass.query, model)
  return {
    section: pass.section,
    content,
    confidence: assessConfidence(content, pass.section),
  }
}

async function runPassesWithTeamEscalation(passesToRun, { companyName, domain, model }) {
  let results = await Promise.all(passesToRun.map(p => runPass(p, model)))

  const teamPass = results.find(p => p.section === 'team')
  if (teamPass && teamPass.confidence !== 'found') {
    const escalation = buildTeamEscalationQuery(companyName, domain, teamPass.content)
    try {
      const escalated = await runPass(escalation, model)
      console.log('[research] team escalation triggered →', escalated.confidence)
      results = mergeTeamEscalation(results, escalated)
    } catch (err) {
      console.warn('[research] team escalation failed:', err.message)
    }
  }

  return results
}

function buildResearchResult(passes, { cached = false, instant = false } = {}) {
  return {
    passes,
    research: mergePassesToLegacyString(passes),
    passCount: passes.length,
    cached,
    instant,
  }
}

export async function runResearch(url, {
  forceRegenerate = false,
  researchMode = 'auto',
  scraped = null,
  companyName = null,
} = {}) {
  const mode = effectiveMode(researchMode, scraped)

  if (mode === 'instant') {
    if (!scraped) throw new Error('Instant research requires scraped website data')
    return {
      research: buildInstantResearch(scraped),
      passes: [],
      passCount: 0,
      cached: false,
      instant: true,
    }
  }

  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not configured')
  }

  const domain = extractDomain(url)
  const cacheKey = `research:v2:${domain}:${mode}`

  if (!forceRegenerate && domain) {
    const cached = await cacheGet(cacheKey)
    if (cached?.passes || cached?.research) {
      if (cached.passes) {
        return { ...cached, cached: true }
      }
      return {
        research: cached,
        passes: [],
        passCount: 0,
        cached: true,
      }
    }
  }

  const allPasses = buildResearchPasses(url, companyName, scraped)
  const passesToRun = selectPassesForMode(mode, allPasses)
  const model = modelForMode(mode)
  const name = companyName?.trim() || scraped?.ogTitle?.trim() || domain

  const results = await runPassesWithTeamEscalation(passesToRun, {
    companyName: name,
    domain,
    model,
  })

  const payload = buildResearchResult(results)

  console.log(
    '[research]',
    domain,
    `→ ${results.length} passes (${results.map(p => p.section).join(',')}) conf:`,
    results.map(p => p.confidence).join(','),
  )

  if (domain && payload.research) {
    await cacheSet(cacheKey, payload, CACHE_TTL.research)
  }

  return { ...payload, cached: false }
}
