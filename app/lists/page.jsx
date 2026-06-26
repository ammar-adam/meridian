'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import PageLoader from '@/components/page-loader'
import IntakeDropzone from '@/components/intake-dropzone'
import BatchRowPreview from '@/components/batch-row-preview'
import {
  parseUrlList,
  runBatchJob,
  fetchActiveBatchJob,
  retryBatchRow,
  jobHasPending,
  normalizeJobForResume,
  recoverInterruptedBatchRows,
} from '@/lib/batch-runner'
import { RESEARCH_MODES } from '@/lib/research-mode'
import { batchResultsToCsv } from '@/lib/crm-export'
import { reconcileLibraryOutcomes, syncShareOutcomesFromServer } from '@/lib/outcome-sync'

const BATCH_KEY = 'meridian_batch_urls'

function ListsContent() {
  const [text, setText] = useState('')
  const [researchMode, setResearchMode] = useState('auto')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [autoResuming, setAutoResuming] = useState(false)
  const abortRef = useRef(null)
  const resumedRef = useRef(false)
  const router = useRouter()

  const runBatchInternal = useCallback(async (resumeJob = null, forceRegenerate = false) => {
    const urls = resumeJob?.urls?.length ? resumeJob.urls : parseUrlList(text)
    if (!urls.length && !resumeJob) return

    abortRef.current = new AbortController()
    setRunning(true)

    if (!resumeJob) {
      setProgress({
        completed: 0,
        failed: 0,
        skipped: 0,
        total: urls.length,
        current: null,
        results: urls.map(url => ({ url, status: 'pending' })),
      })
    }

    try {
      const result = await runBatchJob({
        urls: resumeJob ? undefined : urls,
        resumeJob,
        researchMode: resumeJob?.researchMode || researchMode,
        sourceContext: resumeJob?.sourceContext,
        forceRegenerate,
        concurrency: 3,
        signal: abortRef.current.signal,
        onProgress: (p) => {
          setProgress(p)
          if (p.jobId) setJobId(p.jobId)
        },
      })
      setJobId(result.jobId)
      reconcileLibraryOutcomes()
      syncShareOutcomesFromServer().then(() => reconcileLibraryOutcomes())
    } finally {
      setRunning(false)
      setAutoResuming(false)
      abortRef.current = null
    }
  }, [text, researchMode])

  useEffect(() => {
    reconcileLibraryOutcomes()
    syncShareOutcomesFromServer().then(() => reconcileLibraryOutcomes())

    try {
      const stored = sessionStorage.getItem(BATCH_KEY)
      if (stored) {
        const urls = JSON.parse(stored)
        if (Array.isArray(urls) && urls.length) {
          setText(urls.join('\n'))
          sessionStorage.removeItem(BATCH_KEY)
        }
      }
    } catch { /* ignore */ }

    fetchActiveBatchJob().then(job => {
      if (!job) return
      const normalized = recoverInterruptedBatchRows(job)
      setProgress(normalized.progress)
      setJobId(normalized.id)
      setResearchMode(normalized.researchMode || 'auto')
      if (normalized.urls?.length) setText(normalized.urls.join('\n'))

      if (jobHasPending(normalized) && !resumedRef.current) {
        resumedRef.current = true
        setAutoResuming(true)
        runBatchInternal(normalized)
      }
    })
  }, [runBatchInternal])

  const urlCount = parseUrlList(text).length

  const openMemo = useCallback((memoId) => {
    router.push(`/memo?id=${memoId}`)
  }, [router])

  async function retryRow(i, { researchOnly = false } = {}) {
    if (!progress?.results?.[i]) return
    abortRef.current = new AbortController()
    const results = [...progress.results]
    await retryBatchRow({
      row: results[i],
      index: i,
      results,
      researchMode,
      signal: abortRef.current.signal,
      retryResearch: researchOnly,
      onProgress: (p) => setProgress(prev => ({ ...prev, ...p, results: p.results || prev.results })),
    })
    setProgress(prev => ({
      ...prev,
      results,
      failed: results.filter(r => r.status === 'failed').length,
      completed: results.filter(r => r.status === 'done').length,
    }))
    reconcileLibraryOutcomes()
    syncShareOutcomesFromServer().then(() => reconcileLibraryOutcomes())
  }

  function exportCsv() {
    if (!progress?.results?.length) return
    const csv = batchResultsToCsv(progress.results, window.location.origin)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'meridian-batch.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const failedCount = progress?.results?.filter(r => r.status === 'failed').length || 0
  const canResume = !running && progress && jobHasPending({ results: progress.results })

  return (
    <WorkspaceShell
      title="Lists"
      subtitle={
        autoResuming
          ? 'Resuming batch…'
          : running
            ? (jobId ? 'Processing in background — safe to close tab' : 'Generating briefs…')
            : 'Batch up to 50 companies · auto-resumes on refresh'
      }
      actions={
        <div className="flex gap-2">
          {failedCount > 0 && !running && (
            <button
              type="button"
              onClick={() => runBatchInternal(normalizeJobForResume({ urls: parseUrlList(text), results: progress.results, id: jobId, researchMode, progress }, { resetFailed: true }), true)}
              className="m-btn-secondary m-btn-sm"
            >
              Retry failed ({failedCount})
            </button>
          )}
          {canResume && (
            <button type="button" onClick={() => runBatchInternal(normalizeJobForResume({ urls: parseUrlList(text), results: progress.results, id: jobId, researchMode, progress }))} className="m-btn-secondary m-btn-sm">
              Resume batch
            </button>
          )}
          {progress?.results?.length > 0 && (
            <button type="button" onClick={exportCsv} className="m-btn-secondary m-btn-sm">
              Export CSV
            </button>
          )}
        </div>
      }
    >
      <WorkspacePage width="wide">
        <WorkspaceSection
          title="Company list"
          description="One URL per line. Processes URLs sequentially on server (or 3 at once locally). Leave and come back — progress resumes automatically."
        >
          <IntakeDropzone
            compact
            className="mb-4"
            hint="Paste URLs, CSV domains, or contact export"
            onIntake={(payload) => {
              if (payload.kind === 'company_urls') {
                setText(payload.companyUrls.join('\n'))
                return
              }
              if (payload.kind === 'pipeline') {
                const lines = payload.pipeline.map(c => c.url || (c.domain ? `https://${c.domain}` : '')).filter(Boolean)
                setText(lines.join('\n'))
              }
            }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={running}
            rows={8}
            placeholder={'stripe.com\nhttps://anthropic.com\nnationgraph.com'}
            className="m-input font-mono text-[12px]"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--m-border)' }}>
              {Object.values(RESEARCH_MODES).map(m => (
                <button
                  key={m.id}
                  type="button"
                  disabled={running}
                  onClick={() => setResearchMode(m.id)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                    researchMode === m.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {m.label} <span className="opacity-70">({m.hint})</span>
                </button>
              ))}
            </div>
            <span className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
              {urlCount} URL{urlCount !== 1 ? 's' : ''}{urlCount > 50 ? ' — only first 50 will run' : ''}
              {jobId && <span className="ml-2 font-mono">job {jobId.slice(0, 8)}</span>}
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => runBatchInternal(null, false)}
              disabled={running || urlCount === 0}
              className="m-btn-primary"
            >
              {running ? 'Running…' : `Generate ${urlCount || ''} brief${urlCount !== 1 ? 's' : ''}`}
            </button>
            {running && (
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort()
                  if (jobId) fetch(`/api/batch/${jobId}/cancel`, { method: 'POST' }).catch(() => {})
                }}
                className="m-btn-secondary"
              >
                Stop
              </button>
            )}
          </div>
        </WorkspaceSection>

        {progress && (
          <WorkspaceSection
            title="Progress"
            description={`${progress.completed} done · ${progress.skipped} skipped · ${progress.failed} failed`}
          >
            {progress.current && (
              <p className="mb-3 text-[13px]" style={{ color: 'var(--m-muted)' }}>
                Working on <span className="font-medium text-zinc-900">{progress.current}</span>
              </p>
            )}
            <div className="m-table-wrap">
              <table className="m-table !min-w-0">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Company</th>
                    <th>Domain</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {progress.results.map((r, i) => (
                    <tr key={`${r.url}-${i}`}>
                      <td>
                        <BatchRowPreview scraped={r.scraped} loading={r.status === 'researching'} />
                      </td>
                      <td className="font-medium">{r.companyName || '—'}</td>
                      <td>
                        {r.domain ? (
                          <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" className="text-[13px] underline" style={{ color: 'var(--m-muted)' }}>
                            {r.domain}
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <StatusBadge row={r} />
                      </td>
                      <td className="space-x-1">
                        {r.memoId && (
                          <button type="button" onClick={() => openMemo(r.memoId)} className="m-btn-secondary m-btn-sm">
                            Open
                          </button>
                        )}
                        {r.status === 'failed' && !running && (
                          <>
                            <button type="button" onClick={() => retryRow(i)} className="m-btn-ghost m-btn-sm">
                              Retry
                            </button>
                            {r.canRetryResearch && (
                              <button type="button" onClick={() => retryRow(i, { researchOnly: true })} className="m-btn-ghost m-btn-sm">
                                Retry research
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WorkspaceSection>
        )}
      </WorkspacePage>
    </WorkspaceShell>
  )
}

function StatusBadge({ row }) {
  if (row.status === 'done') return <span className="text-emerald-600 text-[12px] font-medium">Ready</span>
  if (row.status === 'researching') return <span className="text-zinc-600 text-[12px] font-medium">Researching</span>
  if (row.status === 'skipped') return <span className="text-zinc-500 text-[12px]">In library</span>
  if (row.status === 'failed') return <span className="text-red-600 text-[12px]" title={row.error}>Failed</span>
  if (row.status === 'pending') return <span className="text-zinc-400 text-[12px]">Queued</span>
  return <span className="text-zinc-400 text-[12px]">…</span>
}

export default function ListsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ListsContent />
    </Suspense>
  )
}
