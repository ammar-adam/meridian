import { runMemoPipeline, fetchScrapePreview } from '@/lib/memo-pipeline'
import { saveMemo, findMemoByDomain } from '@/lib/memo-library'
import { resolveApiFundContext } from '@/lib/fund-profile'
import { buildMemoMeta } from '@/lib/memo-context'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'
import {
  saveLocalBatchJob,
  loadLocalBatchJob,
  clearLocalBatchJob,
} from '@/lib/batch-jobs'
import {
  parseUrlList,
  normalizeJobForResume,
  jobHasPending,
  recalculateBatchCounts,
  MAX_BATCH,
} from '@/lib/batch-utils'

export { parseUrlList, jobHasPending, normalizeJobForResume }

async function syncJob(jobId, job) {
  const payload = { ...job, progress: { ...job.progress, results: job.results } }
  saveLocalBatchJob(payload)
  if (!jobId) return payload

  try {
    const res = await fetch(`/api/batch/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: payload.status,
        results: payload.results,
        progress: payload.progress,
      }),
    })
    if (res.ok) return normalizeJobForResume(await res.json())
  } catch { /* local mirror remains */ }

  return payload
}

async function createJob(urls, { researchMode, sourceContext } = {}) {
  const list = urls.slice(0, MAX_BATCH)

  try {
    const res = await fetch('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: list,
        researchMode: researchMode || 'quick',
        sourceContext: sourceContext || null,
      }),
    })
    if (res.ok) {
      const data = normalizeJobForResume(await res.json())
      saveLocalBatchJob(data)
      return data
    }
  } catch { /* fallback local */ }

  const localJob = normalizeJobForResume({
    id: null,
    status: 'running',
    researchMode: researchMode || 'quick',
    urls: list,
    results: list.map(url => ({ url, status: 'pending' })),
    sourceContext: sourceContext || null,
  })
  saveLocalBatchJob(localJob)
  return localJob
}

export async function fetchActiveBatchJob() {
  let serverJob = null
  try {
    const res = await fetch('/api/batch', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (data.job) serverJob = normalizeJobForResume(data.job)
    }
  } catch { /* ignore */ }

  const localJob = normalizeJobForResume(loadLocalBatchJob())

  if (serverJob && jobHasPending(serverJob)) {
    saveLocalBatchJob(serverJob)
    return serverJob
  }
  if (localJob && jobHasPending(localJob)) {
    return localJob
  }
  if (serverJob?.status === 'running') return serverJob
  return null
}

function buildListFromJob(job, companies, urls) {
  if (companies?.length) {
    return companies.map(c => ({
      url: c.url || (c.domain ? `https://${c.domain}` : ''),
      name: c.name,
      domain: c.domain,
      fitScore: c.fitScore,
      rationale: c.rationale,
      company: c,
    })).filter(c => c.url)
  }
  if (urls?.length) {
    return urls.map(url => ({
      url: normalizeUrl(url.startsWith('http') ? url : `https://${url}`),
    }))
  }
  return (job?.urls || []).map(url => ({
    url: normalizeUrl(url.startsWith('http') ? url : `https://${url}`),
  }))
}

/**
 * Unified batch runner for Lists + Discover.
 */
export async function runBatchJob({
  companies,
  urls,
  researchMode = 'quick',
  sourceContext = null,
  forceRegenerate = false,
  concurrency = 3,
  onProgress,
  signal,
  resumeJob = null,
}) {
  const fundContext = resolveApiFundContext()
  const fundId = fundContext.id || 'guest'

  let job = resumeJob ? normalizeJobForResume(resumeJob) : null
  const mode = job?.researchMode || researchMode
  const ctx = job?.sourceContext || sourceContext

  let list = buildListFromJob(job, companies, urls)

  if (!job) {
    job = await createJob(list.map(c => c.url), { researchMode: mode, sourceContext: ctx })
    list = buildListFromJob(job, null, null)
  }

  let results = [...(job.results || [])]
  let counts = recalculateBatchCounts(results)

  function emit(current) {
    const progress = {
      ...counts,
      current,
      results: [...results],
      jobId: job.id,
    }
    job.progress = progress
    job.results = results
    onProgress?.(progress)
    return progress
  }

  async function processOne(i) {
    if (signal?.aborted) return

    const row = results[i] || {}
    const item = list[i] || {}
    const url = row.url || item.url
    const domain = row.domain || item.domain || extractDomain(url)
    const label = row.companyName || item.name || domain || url

    if (!url) {
      counts.failed++
      results[i] = { ...row, status: 'failed', error: 'No URL' }
      emit(null)
      return
    }

    if (!forceRegenerate) {
      const existing = findMemoByDomain(url, { fundId, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
      if (existing && (row.status === 'pending' || row.status === 'researching' || !row.status)) {
        counts.skipped++
        results[i] = {
          ...row,
          url,
          domain,
          status: 'skipped',
          memoId: existing.id,
          companyName: existing.companyName,
        }
        counts = recalculateBatchCounts(results)
        emit(null)
        await syncJob(job.id, { ...job, status: 'running', results, progress: job.progress })
        return
      }
    }

    if (row.status === 'done' || row.status === 'skipped') return

    results[i] = { ...row, url, domain, status: 'researching', companyName: label }
    emit(label)

    try {
      const scraped = row.scraped || await fetchScrapePreview(url, signal).catch(() => null)
      if (scraped) {
        results[i] = { ...results[i], scraped, companyName: scraped.ogTitle || label }
        emit(label)
      }

      const sourceCtx = ctx ? {
        ...ctx,
        fitScore: item.fitScore,
        rationale: item.rationale,
        companyName: item.name,
      } : null

      const { memoData, qualityGate, memoId } = await runMemoPipeline({
        url,
        fundContext,
        sourceContext: sourceCtx,
        signal,
        forceRegenerate: forceRegenerate || row.status === 'failed',
        researchMode: mode,
        scraped,
        retryResearch: row.canRetryResearch && row.failedStep === 'research',
      })

      saveMemo(memoData, memoId, {
        outcome: null,
        editCount: 0,
        searchThesis: ctx?.thesis,
        companyDomain: domain,
        ...buildMemoMeta({ url, searchThesis: ctx?.thesis }),
      })

      results[i] = {
        ...results[i],
        url,
        domain,
        status: 'done',
        memoId,
        companyName: memoData.COMPANY_NAME,
        qualityPassed: qualityGate?.passed,
        scraped: scraped || results[i].scraped,
        error: null,
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      results[i] = {
        ...results[i],
        url,
        domain,
        status: 'failed',
        error: err.message,
        failedStep: err.failedStep,
        canRetryResearch: err.canRetryResearch,
        scraped: err.scraped || results[i].scraped,
      }
    }

    counts = recalculateBatchCounts(results)
    emit(null)
    await syncJob(job.id, { ...job, status: 'running', results, progress: job.progress })
  }

  job.status = 'running'
  emit(null)

  const todo = []
  for (let i = 0; i < results.length; i++) {
    const st = results[i]?.status
    if (st === 'done' || st === 'skipped') continue
    if (st === 'failed' && !forceRegenerate) continue
    todo.push(i)
  }

  let cursor = 0
  async function worker() {
    while (cursor < todo.length) {
      if (signal?.aborted) break
      const i = todo[cursor++]
      await processOne(i)
    }
  }

  const workers = Math.min(concurrency, todo.length || 1)
  await Promise.all(Array.from({ length: workers }, () => worker()))

  counts = recalculateBatchCounts(results)
  const finalStatus = signal?.aborted ? 'cancelled' : (jobHasPending({ results }) ? 'running' : 'done')
  job.status = finalStatus
  job.results = results
  job.progress = { ...counts, current: null, results }
  await syncJob(job.id, job)
  if (finalStatus === 'done') clearLocalBatchJob()

  onProgress?.(job.progress)
  return { ...counts, results, cancelled: !!signal?.aborted, jobId: job.id }
}

export async function retryBatchRow({
  row,
  index,
  results,
  researchMode,
  sourceContext,
  onProgress,
  signal,
  retryResearch = false,
}) {
  const fundContext = resolveApiFundContext()
  const url = row.url
  const domain = row.domain || extractDomain(url)

  results[index] = { ...row, status: 'researching', error: null }
  onProgress?.({ results: [...results], current: domain })

  try {
    const { memoData, qualityGate, memoId } = await runMemoPipeline({
      url,
      fundContext,
      sourceContext,
      signal,
      forceRegenerate: true,
      researchMode,
      scraped: row.scraped,
      retryResearch,
    })

    saveMemo(memoData, memoId, {
      outcome: null,
      editCount: 0,
      companyDomain: domain,
      ...buildMemoMeta({ url }),
    })

    results[index] = {
      ...results[index],
      status: 'done',
      memoId,
      companyName: memoData.COMPANY_NAME,
      qualityPassed: qualityGate?.passed,
      error: null,
    }
  } catch (err) {
    results[index] = {
      ...results[index],
      status: 'failed',
      error: err.message,
      failedStep: err.failedStep,
      canRetryResearch: err.canRetryResearch,
    }
  }

  const counts = recalculateBatchCounts(results)
  onProgress?.({ ...counts, results: [...results], current: null })
  return results[index]
}
