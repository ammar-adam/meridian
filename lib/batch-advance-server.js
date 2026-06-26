import { runBriefPipeline } from '@/lib/memo-pipeline-server'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'
import {
  getBatchJobDb,
  updateBatchJobDb,
  isBatchDbEnabled,
} from '@/lib/batch-jobs'
import { recalculateBatchCounts, jobHasPending } from '@/lib/batch-utils'

function normalizeResults(job) {
  const urls = job.urls || []
  const results = [...(job.results || [])]
  while (results.length < urls.length) {
    results.push({ url: urls[results.length], status: 'pending' })
  }
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'researching') {
      results[i] = { ...results[i], status: 'pending' }
    }
    if (results[i].status === 'failed') {
      results[i] = { ...results[i], status: 'pending', error: null }
    }
    if (!results[i].url && urls[i]) {
      results[i] = { ...results[i], url: urls[i] }
    }
  }
  return results
}

function findNextIndex(results) {
  return results.findIndex(r => r.status === 'pending')
}

function buildSourceContext(job, row, index) {
  const ctx = job.sourceContext
  if (!ctx) return null
  const company = ctx.companies?.[index] || row.company || null
  if (!company && !ctx.thesis) return ctx
  return {
    ...ctx,
    fitScore: company?.fitScore ?? row.fitScore,
    rationale: company?.rationale ?? row.rationale,
    companyName: company?.name ?? row.companyName,
  }
}

function qualityFailed(qualityGate) {
  if (!qualityGate || qualityGate.passed) return false
  return (qualityGate.flags || []).some(f => f.severity === 'error')
}

/**
 * Process the next pending URL in a batch job (server-side worker).
 */
export async function advanceBatchJob(jobId, actorId) {
  if (!isBatchDbEnabled()) {
    return { error: 'Database not configured', status: 503 }
  }

  const job = await getBatchJobDb(jobId, actorId)
  if (!job) return { error: 'Job not found', status: 404 }
  if (job.status === 'cancelled' || job.status === 'done') {
    return { job, noWork: true, done: true }
  }

  let results = normalizeResults(job)
  if (results.some(r => r.status === 'researching')) {
    return { job, busy: true, noWork: false }
  }

  const index = findNextIndex(results)
  if (index < 0) {
    const final = await updateBatchJobDb(jobId, actorId, {
      status: 'done',
      results,
      progress: { ...recalculateBatchCounts(results), current: null, results },
    })
    return { job: final, noWork: true, done: true }
  }

  const row = results[index]
  const url = normalizeUrl(row.url || job.urls[index])
  const domain = row.domain || extractDomain(url)
  const label = row.companyName || domain || url
  const company = job.sourceContext?.companies?.[index]

  results[index] = { ...row, url, domain, status: 'researching', companyName: label }
  await updateBatchJobDb(jobId, actorId, {
    status: 'running',
    results,
    progress: { ...recalculateBatchCounts(results), current: label, results },
  })

  const sourceContext = buildSourceContext(job, row, index)
  let processed = { index, url, domain, status: 'failed', error: 'Unknown error' }

  try {
    const pipeline = await runBriefPipeline({
      url,
      fundContext: GUEST_FUND_API_CONTEXT,
      sourceContext,
      researchMode: job.researchMode || 'auto',
      scraped: row.scraped || null,
      retryResearch: !!(row.canRetryResearch && row.failedStep === 'research'),
    })

    if (pipeline.error) {
      results[index] = {
        ...results[index],
        status: 'failed',
        error: pipeline.error,
        failedStep: pipeline.failedStep,
        canRetryResearch: pipeline.canRetryResearch,
        scraped: pipeline.scraped || row.scraped,
      }
      processed = { ...results[index], index }
    } else if (qualityFailed(pipeline.qualityGate)) {
      results[index] = {
        ...results[index],
        status: 'failed',
        error: 'Quality gate failed — verify team names and thesis before sharing',
        qualityPassed: false,
        scraped: pipeline.scraped,
      }
      processed = { ...results[index], index }
    } else {
      results[index] = {
        ...results[index],
        status: 'done',
        memoId: pipeline.memoId,
        companyName: pipeline.memoData?.COMPANY_NAME || label,
        qualityPassed: pipeline.qualityGate?.passed ?? true,
        scraped: pipeline.scraped,
        error: null,
        memoData: pipeline.memoData,
        sector: company?.sector || row.sector || null,
        stage: company?.stage || row.stage || pipeline.memoData?.ROUND || null,
      }
      processed = {
        ...results[index],
        index,
        memoData: pipeline.memoData,
        qualityGate: pipeline.qualityGate,
      }
    }
  } catch (err) {
    results[index] = {
      ...results[index],
      status: 'failed',
      error: err.message || 'Brief failed',
    }
    processed = { ...results[index], index }
  }

  const counts = recalculateBatchCounts(results)
  const done = !jobHasPending({ results })
  const updated = await updateBatchJobDb(jobId, actorId, {
    status: done ? 'done' : 'running',
    results,
    progress: { ...counts, current: null, results },
  })

  return {
    job: updated,
    processed,
    noWork: false,
    done,
  }
}
