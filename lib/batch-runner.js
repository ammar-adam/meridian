import { saveMemo } from '@/lib/memo-library'
import { resolveApiFundContext } from '@/lib/fund-profile'
import { buildMemoMeta } from '@/lib/memo-context'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'
import { deviceIdHeaders } from '@/lib/device-id'
import {
  saveLocalBatchJob,
  loadLocalBatchJob,
  clearLocalBatchJob,
} from '@/lib/batch-jobs'
import {
  parseUrlList,
  normalizeJobForResume,
  recoverInterruptedBatchRows,
  jobHasPending,
  recalculateBatchCounts,
  MAX_BATCH,
} from '@/lib/batch-utils'
import { runMemoPipeline, fetchScrapePreview } from '@/lib/memo-pipeline'
import { findMemoByDomain } from '@/lib/memo-library'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'

export { parseUrlList, jobHasPending, normalizeJobForResume, recoverInterruptedBatchRows }

const BATCH_FETCH = { credentials: 'include', headers: { 'Content-Type': 'application/json' } }

function batchHeaders() {
  return { ...BATCH_FETCH.headers, ...deviceIdHeaders() }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function saveProcessedMemo(processed, job) {
  if (!processed?.memoData || processed.status !== 'done' || !processed.memoId) return
  const ctx = job.sourceContext
  saveMemo(processed.memoData, processed.memoId, {
    outcome: null,
    editCount: 0,
    searchThesis: ctx?.thesis,
    companyDomain: processed.domain,
    qualityPassed: processed.qualityPassed,
    sector: processed.sector || null,
    stage: processed.stage || processed.memoData?.ROUND || null,
    ...buildMemoMeta({ url: processed.url, searchThesis: ctx?.thesis }),
  })
}

async function syncJob(jobId, job) {
  saveLocalBatchJob(job)
  if (!jobId) return job

  try {
    const res = await fetch(`/api/batch/${jobId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: batchHeaders(),
      body: JSON.stringify({
        status: job.status,
        results: job.results,
        progress: job.progress,
      }),
    })
    if (res.ok) return recoverInterruptedBatchRows(await res.json())
  } catch { /* local mirror */ }

  return job
}

async function createJob(urls, { researchMode, sourceContext } = {}) {
  const list = urls.slice(0, MAX_BATCH)
  const fundContext = resolveApiFundContext()
  const wrappedSource = {
    ...(sourceContext || {}),
    _fundContext: fundContext,
  }

  try {
    const res = await fetch('/api/batch', {
      method: 'POST',
      credentials: 'include',
      headers: batchHeaders(),
      body: JSON.stringify({
        urls: list,
        researchMode: researchMode || 'auto',
        sourceContext: wrappedSource,
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
    researchMode: researchMode || 'auto',
    urls: list,
    results: list.map(url => ({ url, status: 'pending' })),
    sourceContext: wrappedSource,
  })
  saveLocalBatchJob(localJob)
  return localJob
}

export async function fetchActiveBatchJob() {
  let serverJob = null
  try {
    const res = await fetch('/api/batch', { cache: 'no-store', credentials: 'include', headers: deviceIdHeaders() })
    if (res.ok) {
      const data = await res.json()
      if (data.job) serverJob = recoverInterruptedBatchRows(data.job)
    }
  } catch { /* ignore */ }

  const localJob = recoverInterruptedBatchRows(loadLocalBatchJob())

  if (serverJob && jobHasPending(serverJob)) {
    saveLocalBatchJob(serverJob)
    return serverJob
  }
  if (localJob && jobHasPending(localJob)) return localJob
  if (serverJob?.status === 'running') return serverJob

  const localDone = loadLocalBatchJob()
  if (localDone?.results?.length) {
    const age = Date.now() - new Date(localDone.updatedAt || 0).getTime()
    if (age < 24 * 60 * 60 * 1000) return recoverInterruptedBatchRows(localDone)
  }
  return null
}

export function fetchLastBatchJob() {
  const local = recoverInterruptedBatchRows(loadLocalBatchJob())
  if (local?.results?.length) return local
  return null
}

export function dismissBatchJob() {
  clearLocalBatchJob()
}

function buildListFromJob(job, companies, urls) {
  if (companies?.length) {
    return companies.map(c => ({
      url: c.url || (c.domain ? `https://${c.domain}` : ''),
      name: c.name,
      domain: c.domain,
      fitScore: c.fitScore,
      rationale: c.rationale,
      sector: c.sector,
      stage: c.stage,
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

async function advanceOnce(jobId, signal) {
  for (let attempt = 0; attempt < 30; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const res = await fetch(`/api/batch/${jobId}/advance`, {
      method: 'POST',
      credentials: 'include',
      headers: deviceIdHeaders(),
      signal,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Advance failed')
    if (data.busy) {
      await sleep(800)
      continue
    }
    return data
  }
  throw new Error('Batch advance timed out waiting for lock')
}

async function runAdvanceBatch(job, { concurrency, signal, onProgress }) {
  let done = false
  let lastJob = job

  async function worker() {
    while (!done && !signal?.aborted) {
      const data = await advanceOnce(job.id, signal)
      lastJob = recoverInterruptedBatchRows(data.job) || data.job
      if (data.processed) saveProcessedMemo(data.processed, lastJob)

      const progress = {
        ...(lastJob.progress || recalculateBatchCounts(lastJob.results)),
        results: lastJob.results,
        jobId: lastJob.id,
      }
      saveLocalBatchJob(lastJob)
      onProgress?.(progress)

      if (data.noWork || data.done) {
        done = true
        break
      }
    }
  }

  const workers = Math.min(concurrency, 3)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return lastJob
}

/** Legacy client-side processing when Neon is unavailable */
async function runLocalBatch(job, list, {
  fundContext,
  fundId,
  mode,
  ctx,
  forceRegenerate,
  concurrency,
  signal,
  onProgress,
}) {
  let results = [...(job.results || [])]
  let counts = recalculateBatchCounts(results)

  function emit(current) {
    const progress = { ...counts, current, results: [...results], jobId: job.id }
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
    if (!url) return

    if (!forceRegenerate) {
      const existing = findMemoByDomain(url, { fundId, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
      if (existing && (row.status === 'pending' || !row.status)) {
        results[i] = { ...row, url, domain, status: 'skipped', memoId: existing.id, companyName: existing.companyName }
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
      const sourceCtx = ctx ? { ...ctx, fitScore: item.fitScore, rationale: item.rationale, companyName: item.name } : null
      const { memoData, qualityGate, memoId } = await runMemoPipeline({
        url, fundContext, sourceContext: sourceCtx, signal,
        forceRegenerate: forceRegenerate || row.status === 'failed',
        researchMode: mode, scraped,
        retryResearch: row.canRetryResearch && row.failedStep === 'research',
      })
      const qErr = qualityGate?.flags?.some(f => f.severity === 'error')
      if (!qualityGate?.passed && qErr) throw new Error('Quality gate failed')

      saveMemo(memoData, memoId, {
        outcome: null, editCount: 0, searchThesis: ctx?.thesis, companyDomain: domain,
        qualityPassed: qualityGate?.passed, sector: item.sector, stage: item.stage,
        ...buildMemoMeta({ url, searchThesis: ctx?.thesis }),
      })
      results[i] = { ...results[i], status: 'done', memoId, companyName: memoData.COMPANY_NAME, qualityPassed: qualityGate?.passed, error: null }
    } catch (err) {
      if (err.name === 'AbortError') return
      results[i] = { ...results[i], status: 'failed', error: err.message, failedStep: err.failedStep, canRetryResearch: err.canRetryResearch }
    }
    counts = recalculateBatchCounts(results)
    emit(null)
    await syncJob(job.id, { ...job, status: 'running', results, progress: job.progress })
  }

  const todo = []
  for (let i = 0; i < results.length; i++) {
    const st = results[i]?.status
    if (st === 'done' || st === 'skipped') continue
    todo.push(i)
  }

  let cursor = 0
  async function worker() {
    while (cursor < todo.length) {
      if (signal?.aborted) break
      await processOne(todo[cursor++])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length || 1) }, () => worker()))
  return { ...job, results, progress: { ...recalculateBatchCounts(results), current: null, results } }
}

export async function runBatchJob({
  companies,
  urls,
  researchMode = 'auto',
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
    list = buildListFromJob(job, companies, urls)
    if (companies?.length && job.results) {
      job.results = job.results.map((r, i) => ({
        ...r,
        companyName: companies[i]?.name,
        domain: companies[i]?.domain,
        sector: companies[i]?.sector,
        stage: companies[i]?.stage,
        fitScore: companies[i]?.fitScore,
        rationale: companies[i]?.rationale,
      }))
      if (job.id) await syncJob(job.id, job)
    }
  }

  job.status = 'running'
  onProgress?.({ ...recalculateBatchCounts(job.results), results: job.results, jobId: job.id })

  let finalJob
  if (job.id) {
    finalJob = await runAdvanceBatch(job, { concurrency, signal, onProgress })
  } else {
    finalJob = await runLocalBatch(job, list, {
      fundContext, fundId, mode, ctx, forceRegenerate, concurrency, signal, onProgress,
    })
  }

  const results = finalJob.results || []
  const counts = recalculateBatchCounts(results)
  const finalStatus = signal?.aborted ? 'cancelled' : (jobHasPending({ results }) ? 'running' : 'done')
  finalJob.status = finalStatus
  finalJob.progress = { ...counts, current: null, results }
  finalJob.updatedAt = new Date().toISOString()
  await syncJob(finalJob.id, finalJob)

  onProgress?.(finalJob.progress)
  return { ...counts, results, cancelled: !!signal?.aborted, jobId: finalJob.id }
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
      url, fundContext, sourceContext, signal, forceRegenerate: true,
      researchMode, scraped: row.scraped, retryResearch,
    })
    const qErr = qualityGate?.flags?.some(f => f.severity === 'error')
    if (!qualityGate?.passed && qErr) throw new Error('Quality gate failed')

    saveMemo(memoData, memoId, {
      outcome: null, editCount: 0, companyDomain: domain,
      qualityPassed: qualityGate?.passed,
      ...buildMemoMeta({ url }),
    })
    results[index] = { ...results[index], status: 'done', memoId, companyName: memoData.COMPANY_NAME, qualityPassed: qualityGate?.passed, error: null }
  } catch (err) {
    results[index] = { ...results[index], status: 'failed', error: err.message, failedStep: err.failedStep, canRetryResearch: err.canRetryResearch }
  }

  const counts = recalculateBatchCounts(results)
  onProgress?.({ ...counts, results: [...results], current: null })
  return results[index]
}
