import { runScrape } from '@/lib/scrape-core'
import { runResearch } from '@/lib/research-core'
import { runGenerate } from '@/lib/generate-core'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'
import { extractDomain } from '@/lib/url-utils'
import { resolveResearchMode, resolveEffectiveResearchMode, timeoutForMode } from '@/lib/research-mode'

function buildMemoId(memoData, domain, cached) {
  const slug = memoData.COMPANY_NAME?.toLowerCase().replace(/\s+/g, '_') || 'memo'
  return cached
    ? `${slug}_${domain}`
    : `${slug}_${Date.now()}`
}

async function ensureScraped(url, scraped, { forceRegenerate }) {
  if (scraped) return scraped
  return runScrape(url, { forceRegenerate })
}

async function ensureResearch(url, {
  effectiveMode,
  scraped,
  forceRegenerate,
  retryResearch,
  prefetchedResearch,
}) {
  if (effectiveMode === 'instant') {
    const result = await runResearch(url, { researchMode: 'instant', scraped })
    return result.research
  }

  if (prefetchedResearch && !forceRegenerate && !retryResearch) {
    return prefetchedResearch
  }

  const result = await runResearch(url, {
    forceRegenerate: forceRegenerate || retryResearch,
    researchMode: effectiveMode,
    scraped,
  })
  return result.research
}

/**
 * Scrape + research with parallel fetch when mode is known upfront (quick/deep).
 */
async function runScrapeAndResearch(url, {
  effectiveMode,
  scraped,
  forceRegenerate,
  retryResearch,
  prefetchedResearch,
}) {
  if (prefetchedResearch && !forceRegenerate && !retryResearch) {
    const nextScraped = await ensureScraped(url, scraped, { forceRegenerate })
    return { scraped: nextScraped, research: prefetchedResearch, fromPrefetch: true }
  }

  if (effectiveMode === 'instant') {
    const nextScraped = await ensureScraped(url, scraped, { forceRegenerate })
    const research = await ensureResearch(url, {
      effectiveMode,
      scraped: nextScraped,
      forceRegenerate,
      retryResearch,
      prefetchedResearch: null,
    })
    return { scraped: nextScraped, research }
  }

  if (!scraped && (effectiveMode === 'quick' || effectiveMode === 'deep')) {
    const [nextScraped, researchResult] = await Promise.all([
      runScrape(url, { forceRegenerate }),
      runResearch(url, {
        forceRegenerate: forceRegenerate || retryResearch,
        researchMode: effectiveMode,
      }),
    ])
    return { scraped: nextScraped, research: researchResult.research }
  }

  const nextScraped = await ensureScraped(url, scraped, { forceRegenerate })
  const research = await ensureResearch(url, {
    effectiveMode,
    scraped: nextScraped,
    forceRegenerate,
    retryResearch,
    prefetchedResearch,
  })
  return { scraped: nextScraped, research }
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
  researchMode = 'auto',
  scrapeOnly = false,
  scraped: existingScraped = null,
  retryResearch = false,
  prefetchedResearch = null,
  generateOnly = false,
}) {
  const requestedMode = resolveResearchMode(researchMode)
  const steps = { scrape: 'pending', research: 'pending', generate: 'pending' }
  let scraped = existingScraped
  let research = null
  let failedStep = null

  if (generateOnly) {
    research = prefetchedResearch
    scraped = existingScraped
    if (!scraped || !research) {
      return { error: 'generateOnly requires scraped and research', steps, failedStep: 'generate' }
    }
    steps.scrape = 'done'
    steps.research = 'done'
  } else {
    try {
      if (scrapeOnly) {
        steps.scrape = 'active'
        scraped = await ensureScraped(url, scraped, { forceRegenerate })
        steps.scrape = 'done'
        return { scraped, steps: { ...steps, research: 'pending', generate: 'pending' } }
      }

      if (scraped) {
        steps.scrape = 'done'
      } else {
        steps.scrape = 'active'
      }

      const effectiveMode = resolveEffectiveResearchMode(requestedMode, scraped)

      if (!scraped && requestedMode === 'auto') {
        scraped = await ensureScraped(url, null, { forceRegenerate })
        steps.scrape = 'done'
      }

      const resolvedMode = resolveEffectiveResearchMode(requestedMode, scraped)
      steps.research = 'active'

      const pair = await runScrapeAndResearch(url, {
        effectiveMode: resolvedMode,
        scraped,
        forceRegenerate,
        retryResearch,
        prefetchedResearch,
      })
      scraped = pair.scraped
      research = pair.research
      steps.scrape = 'done'
      steps.research = 'done'
    } catch (err) {
      if (steps.scrape === 'active') {
        steps.scrape = 'failed'
        failedStep = 'scrape'
      } else {
        steps.research = 'failed'
        failedStep = 'research'
      }
      return {
        error: err.message,
        steps,
        failedStep,
        canRetryResearch: failedStep === 'research',
        scraped: scraped || null,
      }
    }
  }

  const effectiveResearchMode = resolveEffectiveResearchMode(requestedMode, scraped)

  try {
    steps.generate = 'active'
    const { memoData, qualityGate, cached } = await runGenerate({
      research,
      scraped,
      fundContext,
      sourceContext,
      learningContext,
      forceRegenerate,
      researchMode: effectiveResearchMode,
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
      effectiveResearchMode,
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
      effectiveResearchMode,
    }
  }
}

export function timeoutErrorMessage(mode, limitMs, scraped = null) {
  const secs = Math.round(limitMs / 1000)
  const effective = scraped ? resolveEffectiveResearchMode(mode, scraped) : resolveResearchMode(mode)
  const hint = effective === 'deep'
    ? ' Try Quick mode or a company with more public info.'
    : effective === 'instant'
      ? ' Try Quick research for more depth.'
      : ' Try Instant for well-documented sites or pick a better-documented company.'
  return `Brief timed out after ${secs}s —${hint}`
}

export { timeoutForMode, resolveResearchMode, resolveEffectiveResearchMode }
