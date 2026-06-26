/**
 * Client-side memo generation pipeline.
 * scrape + research (parallel) → generate
 */
import { findMemoByDomain } from '@/lib/memo-library'
import { resolveApiFundContext } from '@/lib/fund-profile'
import { buildLearningContext } from '@/lib/edit-tracker'
import { extractDomain } from '@/lib/url-utils'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'
import { PIPELINE_TIMEOUT_MS } from '@/lib/platform'
import { resolveResearchMode, timeoutForMode } from '@/lib/research-mode'

export { MEMO_REUSE_MAX_AGE_MS, PIPELINE_TIMEOUT_MS }

export async function apiFetch(path, body, signal, onDone) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed (${path})`)
  }
  onDone?.()
  return res.json()
}

export function findExistingBrief(url, fundId = 'guest') {
  const id = fundId || 'guest'
  return findMemoByDomain(url, { fundId: id, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
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
}) {
  const mode = resolveResearchMode(researchMode)
  const limit = timeoutMs ?? timeoutForMode(mode)
  const fundContext = fundContextIn || resolveApiFundContext()
  const learningContext = buildLearningContext(fundContext.trackingId)
  const pipelineBody = { forceRegenerate, learningContext }

  const timeoutController = new AbortController()
  const onAbort = () => timeoutController.abort()
  if (signal) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    signal.addEventListener('abort', onAbort)
  }
  const timer = setTimeout(() => {
    timeoutController.abort()
  }, limit)

  const pipelineSignal = timeoutController.signal

  try {
    onStep?.('scrape', 'active')
    onStep?.('research', 'active')

    const [scraped, researchResult] = await Promise.all([
      apiFetch('/api/scrape', { url, ...pipelineBody }, pipelineSignal, () => onStep?.('scrape', 'done')),
      apiFetch('/api/research', { url, researchMode: mode, ...pipelineBody }, pipelineSignal, () => onStep?.('research', 'done')),
    ])

    const { research } = researchResult

    onStep?.('generate', 'active')

    const { memoData, qualityGate, cached } = await apiFetch(
      '/api/generate',
      { research, scraped, fundContext, sourceContext, learningContext, ...pipelineBody },
      pipelineSignal,
      () => onStep?.('generate', 'done')
    )

    const domain = scraped.domain || extractDomain(url)
    const memoId = cached
      ? `${memoData.COMPANY_NAME?.toLowerCase().replace(/\s+/g, '_')}_${domain}`
      : `${memoData.COMPANY_NAME?.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`

    return { memoData, qualityGate, memoId, scraped, research, cached: !!cached, fundContext }
  } catch (err) {
    if (err.name === 'AbortError' && !signal?.aborted) {
      const secs = Math.round(limit / 1000)
      const hint = mode === 'deep'
        ? ' Try Quick mode (~90s) or a company with more public info.'
        : ' Try again or pick a better-documented company.'
      throw new Error(`Brief timed out after ${secs}s —${hint}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
