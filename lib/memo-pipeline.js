/**
 * Client-side memo pipeline — delegates to /api/brief.
 */
import { findMemoByDomain } from '@/lib/memo-library'
import { resolveApiFundContext } from '@/lib/fund-profile'
import { buildLearningContext } from '@/lib/edit-tracker'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'
import { PIPELINE_TIMEOUT_MS } from '@/lib/platform'
import { resolveResearchMode, timeoutForMode } from '@/lib/research-mode'

export { MEMO_REUSE_MAX_AGE_MS, PIPELINE_TIMEOUT_MS }

function timeoutErrorMessage(mode, limitMs) {
  const secs = Math.round(limitMs / 1000)
  const hint = mode === 'deep'
    ? ' Try Quick mode (~90s) or a company with more public info.'
    : ' Try again or pick a better-documented company.'
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

export async function runMemoPipeline({
  url,
  fundContext: fundContextIn,
  sourceContext,
  signal,
  onStep,
  forceRegenerate = false,
  researchMode = 'quick',
  timeoutMs,
  scraped: existingScraped = null,
  retryResearch = false,
}) {
  const mode = resolveResearchMode(researchMode)
  const limit = timeoutMs ?? timeoutForMode(mode)
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
    }
  } catch (err) {
    if (err.name === 'AbortError' && !signal?.aborted) {
      throw new Error(timeoutErrorMessage(mode, limit))
    }
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
