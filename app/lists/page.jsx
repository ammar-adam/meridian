'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import PageLoader from '@/components/page-loader'
import IntakeDropzone from '@/components/intake-dropzone'
import { parseUrlList, runBriefBatch } from '@/lib/brief-batch'
import { RESEARCH_MODES } from '@/lib/research-mode'
import { batchResultsToCsv } from '@/lib/crm-export'
import { getMemoLibrary } from '@/lib/memo-library'

const BATCH_KEY = 'meridian_batch_urls'

function ListsContent() {
  const [text, setText] = useState('')
  const [researchMode, setResearchMode] = useState('quick')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const abortRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
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
  }, [])

  const urlCount = parseUrlList(text).length

  const openMemo = useCallback((memoId) => {
    const entry = getMemoLibrary().find(e => e.id === memoId)
    if (!entry) return
    sessionStorage.setItem('memoData', JSON.stringify(entry.data))
    sessionStorage.setItem('memoSource', 'library')
    sessionStorage.setItem('memoId', entry.id)
    sessionStorage.removeItem('qualityGate')
    router.push('/memo')
  }, [router])

  async function startBatch() {
    const urls = parseUrlList(text)
    if (!urls.length) return

    abortRef.current = new AbortController()
    setRunning(true)
    setProgress({ completed: 0, failed: 0, skipped: 0, total: urls.length, current: null, results: [] })

    try {
      await runBriefBatch({
        urls,
        researchMode,
        concurrency: 3,
        signal: abortRef.current.signal,
        onProgress: setProgress,
      })
    } finally {
      setRunning(false)
      abortRef.current = null
    }
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

  return (
    <WorkspaceShell
      title="Lists"
      subtitle={running ? 'Generating briefs…' : 'Batch up to 50 companies · export to CRM'}
      actions={
        progress?.results?.length > 0 && (
          <button type="button" onClick={exportCsv} className="m-btn-secondary m-btn-sm">
            Export CSV
          </button>
        )
      }
    >
      <WorkspacePage width="wide">
        <WorkspaceSection
          title="Company list"
          description="One URL per line, or drop a CSV / contact export. Runs 3 briefs in parallel."
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
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={startBatch}
              disabled={running || urlCount === 0}
              className="m-btn-primary"
            >
              {running ? 'Running…' : `Generate ${urlCount || ''} brief${urlCount !== 1 ? 's' : ''}`}
            </button>
            {running && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
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
                    <th>Company</th>
                    <th>Domain</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {progress.results.map((r, i) => (
                    <tr key={`${r.url}-${i}`}>
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
                      <td>
                        {r.memoId && (
                          <button type="button" onClick={() => openMemo(r.memoId)} className="m-btn-secondary m-btn-sm">
                            Open brief
                          </button>
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
  if (row.status === 'done') return <span className="text-emerald-600 text-[12px] font-medium">Done</span>
  if (row.status === 'skipped') return <span className="text-zinc-500 text-[12px]">In library</span>
  if (row.status === 'failed') return <span className="text-red-600 text-[12px]" title={row.error}>Failed</span>
  return <span className="text-zinc-400 text-[12px]">…</span>
}

export default function ListsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ListsContent />
    </Suspense>
  )
}
