/**
 * Client-side memo pipeline — delegates to /api/brief and /api/research.
 */
import { findMemoByDomain } from '@/lib/memo-library'
import { resolveApiFundContext } from '@/lib/fund-profile'
import { buildLearningContext } from '@/lib/edit-tracker'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'
import { PIPELINE_TIMEOUT_MS } from '@/lib/platform'
import {
  resolveResearchMode,
  resolveEffectiveResearchMode,
  timeoutForMode,
  needsPerplexity,
} from '@/lib/research-mode'
import { buildInstantResearch } from '@/lib/instant-research'
import { normalizeResearchResult } from '@/lib/research-passes'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'

export { MEMO_REUSE_MAX_AGE_MS, PIPELINE_TIMEOUT_MS }
export { resolveEffectiveResearchMode, needsPerplexity }

function timeoutErrorMessage(mode, limitMs, scraped = null) {
  const secs = Math.round(limitMs / 1000)
  const effective = scraped ? resolveEffectiveResearchMode(mode, scraped) : resolveResearchMode(mode)
  const hint = effective === 'deep'
    ? ' Try Quick mode or a company with more public info.'
    : effective === 'instant'
      ? ' Try Quick research for more depth.'
      : ' Try Instant for well-documented sites or pick a better-documented company.'
  return `Brief timed out after ${secs}s —${hint}`
}

export function findExistingBrief(url, fundId = 'guest') {
  const id = fundId || 'guest'
  return findMemoByDomain(url, { fundId: id, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
}

export async function fetchScrapePreview(url, signal) {
  const res = await fetch('/api/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, scrapeOnly: true }),
    signal,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Scrape failed')
  return data.scraped
}

export async function prefetchResearch(url, researchMode, signal, scraped = null) {
  const mode = resolveResearchMode(researchMode)
  if (mode === 'instant') {
    return normalizeResearchResult(buildInstantResearch(scraped))
  }

  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, researchMode: mode, scraped }),
    signal,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Research prefetch failed')
  return normalizeResearchResult(data)
}

/** Resolve research result — uses prefetch cache, instant body, or live fetch. */
export async function resolveResearchResult(url, {
  researchMode,
  scraped,
  prefetchedResearch = null,
  signal,
  forceRegenerate = false,
  timeoutMs,
}) {
  const effectiveMode = resolveEffectiveResearchMode(researchMode, scraped)
  if (effectiveMode === 'instant') {
    return normalizeResearchResult(buildInstantResearch(scraped))
  }
  if (prefetchedResearch && !forceRegenerate) {
    return normalizeResearchResult(prefetchedResearch)
  }

  const limit = timeoutMs ?? timeoutForMode(researchMode, scraped)
  const timeoutController = new AbortController()
  const onAbort = () => timeoutController.abort()
  if (signal) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    signal.addEventListener('abort', onAbort)
  }
  const timer = setTimeout(() => timeoutController.abort(), limit)

  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, researchMode: effectiveMode, forceRegenerate, scraped }),
      signal: timeoutController.signal,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Research failed')
    return normalizeResearchResult(data)
  } catch (err) {
    if (err.name === 'AbortError' && !signal?.aborted) {
      throw new Error(timeoutErrorMessage(researchMode, limit, scraped))
    }
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** @deprecated Use resolveResearchResult — returns legacy string for callers that need it */
export async function resolveResearchText(url, opts) {
  const result = await resolveResearchResult(url, opts)
  return result.research
}

export async function runMemoPipeline({
  url,
  fundContext: fundContextIn,
  sourceContext,
  signal,
  onStep,
  forceRegenerate = false,
  researchMode = 'auto',
  timeoutMs,
  scraped: existingScraped = null,
  retryResearch = false,
  prefetchedResearch = null,
}) {
  const mode = resolveResearchMode(researchMode)
  const scraped = existingScraped
  const limit = timeoutMs ?? timeoutForMode(mode, scraped)
  const fundContext = fundContextIn || resolveApiFundContext()
  const learningContext = buildLearningContext(fundContext.trackingId)

  const timeoutController = new AbortController()
  const onAbort = () => timeoutController.abort()
  if (signal) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    signal.addEventListener('abort', onAbort)
  }
  const timer = setTimeout(() => timeoutController.abort(), limit)
  const pipelineSignal = timeoutController.signal

  const mergeSignal = () => {
    if (signal?.aborted || timeoutController.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
  }

  try {
    if (!existingScraped && !retryResearch) {
      onStep?.('scrape', 'active')
    } else {
      onStep?.('scrape', 'done')
    }
    onStep?.('research', 'active')
    onStep?.('generate', 'pending')

    const res = await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        fundContext,
        sourceContext,
        learningContext,
        forceRegenerate,
        researchMode: mode,
        scraped: existingScraped,
        retryResearch,
        prefetchedResearch,
      }),
      signal: pipelineSignal,
    })

    const data = await res.json()
    mergeSignal()

    if (data.steps) {
      for (const [step, status] of Object.entries(data.steps)) {
        if (status === 'done' || status === 'active' || status === 'failed') {
          onStep?.(step, status)
        }
      }
    }

    if (!res.ok || data.error) {
      if (data.canRetryResearch) {
        const err = new Error(data.error || 'Research failed')
        err.canRetryResearch = true
        err.scraped = data.scraped
        err.failedStep = data.failedStep
        throw err
      }
      const err = new Error(data.error || 'Brief failed')
      err.failedStep = data.failedStep
      throw err
    }

    onStep?.('scrape', 'done')
    onStep?.('research', 'done')
    onStep?.('generate', 'done')

    return {
      memoData: data.memoData,
      qualityGate: data.qualityGate,
      memoId: data.memoId,
      scraped: data.scraped,
      research: data.research,
      cached: !!data.cached,
      fundContext: data.fundContext || fundContext,
      effectiveResearchMode: data.effectiveResearchMode,
    }
  } catch (err) {
    if (err.name === 'AbortError' && !signal?.aborted) {
      throw new Error(timeoutErrorMessage(mode, limit, scraped))
    }
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Generate step only — used after progressive navigation to /memo. */
export async function completeBriefGenerate({
  url,
  research,
  researchPasses = null,
  scraped,
  fundContext: fundContextIn,
  sourceContext,
  signal,
  forceRegenerate = false,
  researchMode = 'auto',
  memoId: provisionalMemoId = null,
}) {
  const fundContext = fundContextIn || resolveApiFundContext()
  const learningContext = buildLearningContext(fundContext.trackingId)
  const effectiveMode = resolveEffectiveResearchMode(researchMode, scraped)
  const normalized = normalizeResearchResult(
    researchPasses?.length
      ? { research, passes: researchPasses }
      : typeof research === 'object' ? research : { research, passes: researchPasses ?? [] },
  )

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      research: normalized.research,
      researchPasses: normalized.passes,
      scraped,
      fundContext,
      sourceContext,
      learningContext,
      forceRegenerate,
      researchMode: effectiveMode,
    }),
    signal,
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Generate failed')

  const domain = scraped?.domain || extractDomain(url)
  const slug = data.memoData?.COMPANY_NAME?.toLowerCase().replace(/\s+/g, '_') || 'memo'
  const memoId = provisionalMemoId
    || (data.cached ? `${slug}_${domain}` : `${slug}_${Date.now()}`)

  return {
    memoData: data.memoData,
    qualityGate: data.qualityGate,
    memoId,
    cached: !!data.cached,
    fundContext,
    effectiveResearchMode: effectiveMode,
  }
}

export function urlsMatchForPrefetch(a, b) {
  if (!a || !b) return false
  return extractDomain(normalizeUrl(a)) === extractDomain(normalizeUrl(b))
}
