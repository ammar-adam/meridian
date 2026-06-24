import { runMemoPipeline } from '@/lib/memo-pipeline'
import { saveMemo, findMemoByDomain } from '@/lib/memo-library'
import { toApiFundContext } from '@/lib/fund-profile'
import { buildMemoMeta } from '@/lib/memo-context'
import { extractDomain } from '@/lib/url-utils'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'

/**
 * Process companies sequentially through the memo pipeline.
 * Skips companies that already have a recent brief in the library.
 */
export async function runBatchBrief({
  companies,
  fundProfile,
  sourceContext,
  onProgress,
  signal,
  forceRegenerate = false,
}) {
  const fundContext = toApiFundContext(fundProfile)
  const results = []
  let completed = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < companies.length; i++) {
    if (signal?.aborted) break

    const company = companies[i]
    const url = company.url || (company.domain ? `https://${company.domain}` : '')
    if (!url) {
      failed++
      results.push({ company, status: 'skipped', error: 'No URL' })
      onProgress?.({ completed, failed, skipped, total: companies.length, current: company.name, results })
      continue
    }

    if (!forceRegenerate) {
      const existing = findMemoByDomain(url, { fundId: fundProfile.id, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
      if (existing) {
        skipped++
        results.push({
          company,
          status: 'skipped',
          reason: 'existing_brief',
          memoId: existing.id,
          companyName: existing.companyName,
        })
        onProgress?.({ completed, failed, skipped, total: companies.length, current: company.name, results })
        continue
      }
    }

    onProgress?.({
      completed,
      failed,
      skipped,
      total: companies.length,
      current: company.name,
      index: i,
      results,
    })

    try {
      const ctx = sourceContext ? {
        ...sourceContext,
        fitScore: company.fitScore,
        rationale: company.rationale,
        companyName: company.name,
      } : null

      const { memoData, qualityGate, memoId } = await runMemoPipeline({
        url,
        fundContext,
        sourceContext: ctx,
        signal,
        forceRegenerate,
      })

      if (!qualityGate?.passed) {
        failed++
        results.push({
          company,
          status: 'failed',
          error: 'Quality gate failed',
          qualityFlags: qualityGate?.flags?.filter(f => f.severity === 'error'),
        })
        onProgress?.({ completed, failed, skipped, total: companies.length, current: null, results })
        continue
      }

      saveMemo(memoData, memoId, {
        outcome: null,
        editCount: 0,
        searchThesis: sourceContext?.thesis,
        companyDomain: extractDomain(url),
        ...buildMemoMeta({ url, searchThesis: sourceContext?.thesis }),
      })
      completed++
      results.push({
        company,
        status: 'done',
        memoId,
        companyName: memoData.COMPANY_NAME,
        qualityPassed: qualityGate?.passed,
      })
    } catch (err) {
      if (err.name === 'AbortError') break
      failed++
      results.push({ company, status: 'failed', error: err.message })
    }

    onProgress?.({ completed, failed, skipped, total: companies.length, current: null, results })
  }

  return { completed, failed, skipped, results, cancelled: signal?.aborted }
}
