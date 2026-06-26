import { runMemoPipeline } from '@/lib/memo-pipeline'
import { saveMemo, findMemoByDomain } from '@/lib/memo-library'
import { resolveApiFundContext } from '@/lib/fund-profile'
import { buildMemoMeta } from '@/lib/memo-context'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'

const MAX_BATCH = 50

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

/**
 * Run briefs with limited parallelism (default 3) for batch / list workflows.
 */
export async function runBriefBatch({
  urls,
  researchMode = 'quick',
  forceRegenerate = false,
  concurrency = 3,
  onProgress,
  signal,
}) {
  const fundContext = resolveApiFundContext()
  const fundProfile = fundContext
  const list = urls.slice(0, MAX_BATCH)
  const results = new Array(list.length)
  let completed = 0
  let failed = 0
  let skipped = 0
  let index = 0

  function emit(current) {
    onProgress?.({
      completed,
      failed,
      skipped,
      total: list.length,
      current,
      results: [...results],
    })
  }

  async function worker() {
    while (index < list.length) {
      if (signal?.aborted) break
      const i = index++
      const url = list[i]
      const domain = extractDomain(url)
      const label = domain || url

      if (!forceRegenerate && fundProfile?.id) {
        const existing = findMemoByDomain(url, { fundId: fundProfile.id, maxAgeMs: MEMO_REUSE_MAX_AGE_MS })
        if (existing) {
          skipped++
          results[i] = {
            url,
            domain,
            status: 'skipped',
            memoId: existing.id,
            companyName: existing.companyName,
          }
          emit(null)
          continue
        }
      }

      emit(label)

      try {
        const { memoData, qualityGate, memoId } = await runMemoPipeline({
          url,
          fundContext,
          signal,
          forceRegenerate,
          researchMode,
        })

        saveMemo(memoData, memoId, {
          outcome: null,
          editCount: 0,
          companyDomain: domain,
          ...buildMemoMeta({ url }),
        })

        completed++
        results[i] = {
          url,
          domain,
          status: 'done',
          memoId,
          companyName: memoData.COMPANY_NAME,
          qualityPassed: qualityGate?.passed,
        }
      } catch (err) {
        if (err.name === 'AbortError') break
        failed++
        results[i] = { url, domain, status: 'failed', error: err.message }
      }

      emit(null)
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, list.length) }, () => worker())
  await Promise.all(pool)

  return {
    completed,
    failed,
    skipped,
    results: results.filter(Boolean),
    cancelled: !!signal?.aborted,
  }
}
