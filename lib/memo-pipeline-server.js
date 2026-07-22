import { runScrape } from '@/lib/scrape-core'
import { runResearch } from '@/lib/research-core'
import { runGenerate } from '@/lib/generate-core'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'
import { extractDomain } from '@/lib/url-utils'
import { resolveResearchMode, resolveEffectiveResearchMode, timeoutForMode } from '@/lib/research-mode'
import { normalizeResearchResult, mergePassesToLegacyString } from '@/lib/research-passes'
import { getRecord, getFreshResearch, saveResearch } from '@/lib/server/company-records'

/**
 * Build brief context from a stored company record — founders, funding,
 * prior sightings — so the generator starts with known facts instead of zero.
 */
function recordToSourceContext(record) {
  if (!record?.company) return null
  const { company, people, funding, sightings } = record
  const founders = (people || []).map(p => p.name).filter(Boolean)
  const latestFunding = funding?.[0]
  const provenance = sightings?.[0]?.provenance
  return {
    fromRecord: true,
    companyId: company.id,
    companyName: company.name,
    domain: company.domain,
    geography: company.geography,
    stage: company.stage,
    oneLiner: company.one_liner,
    founders,
    funding: latestFunding
      ? { kind: latestFunding.kind, amount: latestFunding.amount, date: latestFunding.event_date }
      : null,
    firstObservedAt: company.first_observed_at,
    provenance,
  }
}

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

async function ensureResearchResult(url, {
  effectiveMode,
  scraped,
  forceRegenerate,
  retryResearch,
  prefetchedResearch,
}) {
  if (prefetchedResearch && !forceRegenerate && !retryResearch) {
    return normalizeResearchResult(prefetchedResearch)
  }

  const result = await runResearch(url, {
    forceRegenerate: forceRegenerate || retryResearch,
    researchMode: effectiveMode,
    scraped,
    companyName: scraped?.ogTitle,
  })
  return normalizeResearchResult(result)
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
    const normalized = normalizeResearchResult(prefetchedResearch)
    return { scraped: nextScraped, ...normalized, fromPrefetch: true }
  }

  if (effectiveMode === 'instant') {
    const nextScraped = await ensureScraped(url, scraped, { forceRegenerate })
    const normalized = await ensureResearchResult(url, {
      effectiveMode,
      scraped: nextScraped,
      forceRegenerate,
      retryResearch,
      prefetchedResearch: null,
    })
    return { scraped: nextScraped, ...normalized }
  }

  if (!scraped && (effectiveMode === 'quick' || effectiveMode === 'deep')) {
    const [nextScraped, researchResult] = await Promise.all([
      runScrape(url, { forceRegenerate }),
      runResearch(url, {
        forceRegenerate: forceRegenerate || retryResearch,
        researchMode: effectiveMode,
      }),
    ])
    const normalized = normalizeResearchResult(researchResult)
    return { scraped: nextScraped, ...normalized }
  }

  const nextScraped = await ensureScraped(url, scraped, { forceRegenerate })
  const normalized = await ensureResearchResult(url, {
    effectiveMode,
    scraped: nextScraped,
    forceRegenerate,
    retryResearch,
    prefetchedResearch,
  })
  return { scraped: nextScraped, ...normalized }
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
  let researchPasses = []
  let failedStep = null
  let fromRecord = false
  let enrichedSourceContext = sourceContext

  // Warm-start from the Company Record when we already know this domain.
  const domainHint = extractDomain(url)
  if (domainHint && !forceRegenerate && !generateOnly) {
    try {
      const record = await getRecord(domainHint)
      if (record?.company) {
        const recordCtx = recordToSourceContext(record)
        enrichedSourceContext = sourceContext
          ? { ...sourceContext, ...recordCtx }
          : recordCtx
        if (!prefetchedResearch && !retryResearch) {
          const cachedPasses = await getFreshResearch(domainHint, { maxAgeDays: 30 })
          if (cachedPasses?.length) {
            prefetchedResearch = {
              passes: cachedPasses,
              research: mergePassesToLegacyString(cachedPasses),
              passCount: cachedPasses.length,
              cached: true,
              fromRecord: true,
            }
            fromRecord = true
          }
        }
      }
    } catch (e) {
      console.warn('[brief] record warm-start skipped:', e.message)
    }
  }

  if (generateOnly) {
    const normalized = normalizeResearchResult(prefetchedResearch)
    research = normalized.research
    researchPasses = normalized.passes
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
      researchPasses = pair.passes ?? []
      fromRecord = fromRecord || !!pair.cached || !!pair.fromPrefetch
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
      researchPasses,
      scraped,
      fundContext,
      sourceContext: enrichedSourceContext,
      learningContext,
      forceRegenerate,
      researchMode: effectiveResearchMode,
    })
    steps.generate = 'done'

    const domain = scraped.domain || extractDomain(url)
    const memoId = buildMemoId(memoData, domain, cached)

    // Compound: write research back so the next brief on this company is warm.
    if (domain && researchPasses?.length && !fromRecord) {
      saveResearch(domain, researchPasses, { source: 'brief' }).catch(() => {})
    }

    return {
      memoData,
      qualityGate,
      memoId,
      scraped,
      research,
      researchPasses,
      passCount: researchPasses.length,
      cached: !!cached || fromRecord,
      fromRecord,
      fundContext,
      sourceContext: enrichedSourceContext,
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
      researchPasses,
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
