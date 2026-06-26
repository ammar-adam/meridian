import { normalizeUrl } from '@/lib/url-utils'

export const MAX_BATCH = 50

export function parseUrlList(text) {
  const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const urls = []
  for (const line of lines) {
    const raw = line.match(/https?:\/\/[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}/i)?.[0]
    if (!raw) continue
    try {
      urls.push(normalizeUrl(raw.startsWith('http') ? raw : `https://${raw}`))
    } catch { /* skip */ }
  }
  return [...new Set(urls)].slice(0, MAX_BATCH)
}

export function jobHasPending(job) {
  if (!job?.results?.length) return job?.urls?.length > 0
  return job.results.some(r => r.status === 'pending' || r.status === 'researching')
}

export function recalculateBatchCounts(results) {
  return {
    completed: results.filter(r => r.status === 'done').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    total: results.length,
    current: null,
  }
}

/** Reset interrupted rows and align results length with urls */
export function recoverInterruptedBatchRows(job) {
  if (!job) return null
  const urls = job.urls || []
  const results = [...(job.results || [])]

  while (results.length < urls.length) {
    results.push({ url: urls[results.length], status: 'pending' })
  }

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'researching') {
      results[i] = { ...results[i], status: 'pending' }
    }
    if (!results[i].url && urls[i]) {
      results[i] = { ...results[i], url: urls[i] }
    }
  }

  const progress = {
    ...recalculateBatchCounts(results),
    current: null,
    results,
  }

  return {
    ...job,
    status: jobHasPending({ ...job, results }) ? 'running' : 'done',
    results,
    progress,
  }
}

/** Resume batch — only reset crashed rows unless resetFailed is true (Retry failed UI). */
export function normalizeJobForResume(job, { resetFailed = false } = {}) {
  if (!job) return null
  const urls = job.urls || []
  const results = [...(job.results || [])]

  while (results.length < urls.length) {
    results.push({ url: urls[results.length], status: 'pending' })
  }

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'researching') {
      results[i] = { ...results[i], status: 'pending' }
    }
    if (resetFailed && results[i].status === 'failed') {
      results[i] = { ...results[i], status: 'pending', error: null }
    }
    if (!results[i].url && urls[i]) {
      results[i] = { ...results[i], url: urls[i] }
    }
  }

  const progress = {
    ...recalculateBatchCounts(results),
    current: null,
    results,
  }

  return {
    ...job,
    status: jobHasPending({ ...job, results }) ? 'running' : 'done',
    results,
    progress,
  }
}
