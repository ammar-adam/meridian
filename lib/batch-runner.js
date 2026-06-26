import { parseUrlList } from '@/lib/brief-batch'
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

export { parseUrlList }

const MAX_BATCH = 50

function emptyProgress(total) {
  return { completed: 0, failed: 0, skipped: 0, total, current: null }
}

function buildCompanyRow(url, extra = {}) {
  const domain = extractDomain(url)
  return { url, domain, status: 'pending', ...extra }
}

async function syncJob(jobId, job, { userId } = {}) {
  saveLocalBatchJob(job)
  if (!jobId) return job

  try {
    const res = await fetch(`/api/batch/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: job.status,
        results: job.results,
        progress: job.progress,
      }),
    })
    if (res.ok) return await res.json()
  } catch { /* local mirror remains */ }

  return job
}

async function createJob(urls, { researchMode, sourceContext } = {}) {
  const list = urls.slice(0, MAX_BATCH)
  const localJob = {
    id: null,
    status: 'running',
    researchMode: researchMode || 'quick',
    urls: list,
    results: list.map(url => buildCompanyRow(url)),
    progress: emptyProgress(list.length),
    sourceContext: sourceContext || null,
  }

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
      const data = await res.json()
      saveLocalBatchJob(data)
      return data
    }
  } catch { /* fallback local */ }

  saveLocalBatchJob(localJob)
  return localJob
}

export async function fetchActiveBatchJob() {
  try {
    const res = await fetch('/api/batch')
    if (res.ok) {
      const data = await res.json()
      if (data.job) {
        saveLocalBatchJob(data.job)
        return data.job
      }
    }
  } catch { /* ignore */ }

  const local = loadLocalBatchJob()
  if (local?.status === 'running') return local
  return null
}

/**
 * Unified batch runner for Lists + Discover.
 * companies: array of { url, name?, domain?, fitScore?, rationale? } OR url strings
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

  let list = []
  if (urls?.length) {
    list = urls.map(url => ({ url: normalizeUrl(url.startsWith('http') ? url : `https://${url}`) }))
  } else if (companies?.length) {
    list = companies.map(c => ({
      url: c.url || (c.domain ? `https://${c.domain}` : ''),
      name: c.name,
      domain: c.domain,
      fitScore: c.fitScore,
      rationale: c.rationale,
      company: c,
    })).filter(c => c.url)
  }

  let job = resumeJob
  if (!job) {
    job = await createJob(list.map(c => c.url), { researchMode, sourceContext })
  }

  const results = [...(job.results || [])]
  let { completed = 0, failed = 0, skipped = 0 } = job.progress || emptyProgress(list.length)
  let index = results.findIndex(r => r.status === 'pending' || r.status === 'researching')
  if (index < 0) index = results.length

  function emit(current) {
    const progress = {
      completed,
      failed,
      skipped,
      total: results.length,
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

    const item = list[i]
    const url = item.url
    const domain = item.domain || extractDomain(url)
    const label = item.name || domain || url

    if (!url) {
      failed++
      results[i] = { ...results[i], url, status: 'failed', error: 'No URL' }
      emit(null)
      return
    }

    if (!forceRegenerate) {
      const existing = findMemoByDomain(url, { fundId, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
      if (existing) {
        skipped++
        results[i] = {
          ...results[i],
          url,
          domain,
          status: 'skipped',
          memoId: existing.id,
          companyName: existing.companyName,
        }
        emit(null)
        return
      }
    }

    results[i] = { ...results[i], url, domain, status: 'researching', companyName: label }
    emit(label)

    try {
      const scraped = await fetchScrapePreview(url, signal).catch(() => null)
      if (scraped) {
        results[i] = { ...results[i], scraped, companyName: scraped.ogTitle || label }
        emit(label)
      }

      const ctx = sourceContext ? {
        ...sourceContext,
        fitScore: item.fitScore,
        rationale: item.rationale,
        companyName: item.name,
      } : null

      const { memoData, qualityGate, memoId } = await runMemoPipeline({
        url,
        fundContext,
        sourceContext: ctx,
        signal,
        forceRegenerate,
        researchMode,
        scraped,
      })

      saveMemo(memoData, memoId, {
        outcome: null,
        editCount: 0,
        searchThesis: sourceContext?.thesis,
        companyDomain: domain,
        ...buildMemoMeta({ url, searchThesis: sourceContext?.thesis }),
      })

      completed++
      results[i] = {
        ...results[i],
        url,
        domain,
        status: 'done',
        memoId,
        companyName: memoData.COMPANY_NAME,
        qualityPassed: qualityGate?.passed,
        scraped: scraped || results[i].scraped,
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      failed++
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

    emit(null)
    await syncJob(job.id, { ...job, status: 'running', results, progress: job.progress })
  }

  job.status = 'running'
  emit(null)

  const pending = []
  for (let i = 0; i < list.length; i++) {
    if (results[i]?.status === 'pending' || results[i]?.status === 'researching' || !results[i]) {
      pending.push(i)
    }
  }

  let cursor = 0
  async function worker() {
    while (cursor < pending.length) {
      if (signal?.aborted) break
      const i = pending[cursor++]
      await processOne(i)
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, pending.length || 1) }, () => worker())
  await Promise.all(pool)

  const finalStatus = signal?.aborted ? 'cancelled' : 'done'
  job.status = finalStatus
  job.results = results
  job.progress = { completed, failed, skipped, total: results.length, current: null, results }
  await syncJob(job.id, job)
  if (finalStatus === 'done') clearLocalBatchJob()

  onProgress?.(job.progress)
  return { completed, failed, skipped, results, cancelled: !!signal?.aborted, jobId: job.id }
}

/** Retry a single failed row in an existing batch */
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
      researchMode: retryResearch ? researchMode : researchMode,
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

  onProgress?.({ results: [...results], current: null })
  return results[index]
}
