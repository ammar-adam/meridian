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

export function findExistingBrief(url, fundId) {
  if (!fundId || fundId === 'guest') return null
  return findMemoByDomain(url, { fundId, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
}

export async function runMemoPipeline({
  url,
  fundContext: fundContextIn,
  sourceContext,
  signal,
  onStep,
  forceRegenerate = false,
  timeoutMs = PIPELINE_TIMEOUT_MS,
}) {
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
  }, timeoutMs)

  const pipelineSignal = timeoutController.signal

  try {
    onStep?.('scrape', 'active')
    onStep?.('research', 'active')

    const [scraped, researchResult] = await Promise.all([
      apiFetch('/api/scrape', { url, ...pipelineBody }, pipelineSignal, () => onStep?.('scrape', 'done')),
      apiFetch('/api/research', { url, ...pipelineBody }, pipelineSignal, () => onStep?.('research', 'done')),
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
      throw new Error(`Brief timed out after ${Math.round(timeoutMs / 1000)}s — try again or use a better-documented company.`)
    }
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
