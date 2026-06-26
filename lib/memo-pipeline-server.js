import { runScrape } from '@/lib/scrape-core'
import { runResearch } from '@/lib/research-core'
import { runGenerate } from '@/lib/generate-core'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'
import { extractDomain } from '@/lib/url-utils'
import { resolveResearchMode, timeoutForMode } from '@/lib/research-mode'

function buildMemoId(memoData, domain, cached) {
  const slug = memoData.COMPANY_NAME?.toLowerCase().replace(/\s+/g, '_') || 'memo'
  return cached
    ? `${slug}_${domain}`
    : `${slug}_${Date.now()}`
}

/**
 * Server-side brief pipeline with per-step status and optional scrape-only / research retry.
 */
export async function runBriefPipeline({
  url,
  fundContext = GUEST_FUND_API_CONTEXT,
  sourceContext = null,
  learningContext = null,
  forceRegenerate = false,
  researchMode = 'quick',
  scrapeOnly = false,
  scraped: existingScraped = null,
  retryResearch = false,
}) {
  const mode = resolveResearchMode(researchMode)
  const steps = { scrape: 'pending', research: 'pending', generate: 'pending' }
  let scraped = existingScraped
  let research = null
  let failedStep = null

  try {
    if (!scraped || retryResearch === false) {
      steps.scrape = 'active'
      scraped = await runScrape(url, { forceRegenerate })
      steps.scrape = 'done'
    } else {
      steps.scrape = 'done'
    }
  } catch (err) {
    steps.scrape = 'failed'
    failedStep = 'scrape'
    return {
      error: err.message,
      steps,
      failedStep,
      canRetryResearch: false,
      scraped: scraped || null,
    }
  }

  if (scrapeOnly) {
    return { scraped, steps: { ...steps, research: 'pending', generate: 'pending' } }
  }

  try {
    steps.research = 'active'
    const researchResult = await runResearch(url, {
      forceRegenerate: forceRegenerate || retryResearch,
      researchMode: mode,
    })
    research = researchResult.research
    steps.research = 'done'
  } catch (err) {
    steps.research = 'failed'
    failedStep = 'research'
    return {
      error: err.message,
      steps,
      failedStep,
      canRetryResearch: true,
      scraped,
    }
  }

  try {
    steps.generate = 'active'
    const { memoData, qualityGate, cached } = await runGenerate({
      research,
      scraped,
      fundContext,
      sourceContext,
      learningContext,
      forceRegenerate,
    })
    steps.generate = 'done'

    const domain = scraped.domain || extractDomain(url)
    const memoId = buildMemoId(memoData, domain, cached)

    return {
      memoData,
      qualityGate,
      memoId,
      scraped,
      research,
      cached: !!cached,
      fundContext,
      steps,
    }
  } catch (err) {
    steps.generate = 'failed'
    failedStep = 'generate'
    return {
      error: err.message,
      steps,
      failedStep,
      canRetryResearch: false,
      scraped,
      research,
    }
  }
}

export function timeoutErrorMessage(mode, limitMs) {
  const secs = Math.round(limitMs / 1000)
  const hint = mode === 'deep'
    ? ' Try Quick mode (~90s) or a company with more public info.'
    : ' Try again or pick a better-documented company.'
  return `Brief timed out after ${secs}s —${hint}`
}

export { timeoutForMode, resolveResearchMode }
