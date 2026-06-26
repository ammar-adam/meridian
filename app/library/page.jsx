'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import EmptyState from '@/components/empty-state'
import BriefStarters from '@/components/brief-starters'
import { downloadLibraryCsv } from '@/lib/crm-export'
import { createShareLink } from '@/lib/memo-export'
import { getMemoLibrary, getRelatedMemos, updateMemoMeta } from '@/lib/memo-library'
import { reconcileLibraryOutcomes, syncShareOutcomesFromServer } from '@/lib/outcome-sync'

function sortLibrary(entries) {
  return [...entries].sort((a, b) => {
    const aPending = !a.outcome ? 0 : 1
    const bPending = !b.outcome ? 0 : 1
    if (aPending !== bPending) return aPending - bPending
    return (b.savedAt || '').localeCompare(a.savedAt || '')
  })
}

export default function LibraryPage() {
  const [library, setLibrary] = useState([])
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [sharing, setSharing] = useState(false)
  const router = useRouter()

  function reload() {
    reconcileLibraryOutcomes()
    setLibrary(getMemoLibrary())
    syncShareOutcomesFromServer().then(() => {
      reconcileLibraryOutcomes()
      setLibrary(getMemoLibrary())
    })
  }

  useEffect(() => {
    reload()
    window.addEventListener('meridian-context-change', reload)
    window.addEventListener('meridian-sync-complete', reload)
    return () => {
      window.removeEventListener('meridian-context-change', reload)
      window.removeEventListener('meridian-sync-complete', reload)
    }
  }, [])

  const filtered = useMemo(() => {
    let rows = library
    if (outcomeFilter === 'pending') rows = rows.filter(e => !e.outcome)
    if (outcomeFilter === 'pursue') rows = rows.filter(e => e.outcome === 'pursue')
    if (outcomeFilter === 'pass') rows = rows.filter(e => e.outcome === 'pass')
    return sortLibrary(rows)
  }, [library, outcomeFilter])

  const pending = library.filter(e => !e.outcome).length

  function openMemo(id) {
    router.push(`/memo?id=${id}`)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkShareWithGp() {
    if (!selected.size) return
    setSharing(true)
    try {
      const lines = []
      for (const id of selected) {
        const entry = library.find(e => e.id === id)
        if (!entry?.data) continue
        const { url, shareId } = await createShareLink(entry.data, {
          memoId: id,
          allowOutcome: true,
          fundName: entry.fundName,
          outcome: entry.outcome,
        })
        updateMemoMeta(id, { lastShareId: shareId })
        lines.push(`${entry.companyName}\t${url}`)
      }
      await navigator.clipboard.writeText(lines.join('\n'))
    } finally {
      setSharing(false)
    }
  }

  function statusLabel(entry) {
    if (entry.outcome) return 'Reviewed'
    return 'Ready'
  }

  return (
    <WorkspaceShell
      title="Library"
      subtitle={library.length ? `${library.length} briefs · ${pending} awaiting review` : 'Saved briefs'}
      actions={
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button type="button" disabled={sharing} onClick={bulkShareWithGp} className="m-btn-primary m-btn-sm">
              {sharing ? 'Sharing…' : `Share ${selected.size} with GP`}
            </button>
          )}
          {filtered.length > 0 && (
            <button type="button" onClick={() => downloadLibraryCsv('meridian-briefs.csv', filtered)} className="m-btn-secondary m-btn-sm">
              Export CSV
            </button>
          )}
          <button type="button" onClick={() => router.push('/lists')} className="m-btn-ghost m-btn-sm">
            Batch list
          </button>
        </div>
      }
    >
      <WorkspacePage width="wide">
        {pending > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            <span className="font-medium">{pending} brief{pending !== 1 ? 's' : ''} need review.</span>
            {' '}Pursue/pass signals train Discover ranking and thesis band.
            {outcomeFilter !== 'pending' && (
              <button type="button" onClick={() => setOutcomeFilter('pending')} className="ml-2 font-medium underline">
                Show pending
              </button>
            )}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip active={outcomeFilter === 'all'} onClick={() => setOutcomeFilter('all')}>All</FilterChip>
          <FilterChip active={outcomeFilter === 'pending'} onClick={() => setOutcomeFilter('pending')}>
            Needs review{pending > 0 ? ` (${pending})` : ''}
          </FilterChip>
          <FilterChip active={outcomeFilter === 'pursue'} onClick={() => setOutcomeFilter('pursue')}>Pursue</FilterChip>
          <FilterChip active={outcomeFilter === 'pass'} onClick={() => setOutcomeFilter('pass')}>Pass</FilterChip>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No briefs yet"
            description="Generate from any company URL or run a batch list."
            primaryHref="/brief"
            primaryLabel="Generate a brief"
            secondaryHref="/lists"
            secondaryLabel="Batch list"
          />
        ) : (
          <WorkspaceSection title="Briefs" description="Click a row to open. Select rows to bulk-share with GP.">
            <div className="m-table-wrap">
              <table className="m-table !min-w-0">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={() => {
                          setSelected(selected.size === filtered.length
                            ? new Set()
                            : new Set(filtered.map(e => e.id)))
                        }}
                        className="rounded"
                      />
                    </th>
                    <th>Company</th>
                    <th>Domain</th>
                    <th>Status</th>
                    <th>Round</th>
                    <th>Outcome</th>
                    <th>Saved</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => {
                    const related = getRelatedMemos(entry.companyDomain, entry.id)
                    const domain = entry.companyDomain
                    return (
                      <tr
                        key={entry.id}
                        className={`cursor-pointer ${!entry.outcome ? 'm-row-attention' : ''}`}
                        onClick={() => openMemo(entry.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="rounded"
                          />
                        </td>
                        <td>
                          <div className="font-medium">{entry.companyName}</div>
                          {related.length > 0 && (
                            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>
                              +{related.length} other brief{related.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {domain ? (
                            <a
                              href={`https://${domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] underline"
                              style={{ color: 'var(--m-muted)' }}
                            >
                              {domain}
                            </a>
                          ) : (
                            <span className="text-[13px]" style={{ color: 'var(--m-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>{statusLabel(entry)}</td>
                        <td className="text-[13px]" style={{ color: 'var(--m-muted)' }}>{entry.round}</td>
                        <td>
                          {entry.outcome ? (
                            <span className={entry.outcome === 'pursue' ? 'm-outcome-pursue' : 'm-outcome-pass'}>{entry.outcome}</span>
                          ) : entry.gpOutcome ? (
                            <span className="text-[12px] text-violet-700" title={entry.gpReviewer ? `GP: ${entry.gpReviewer}` : ''}>
                              GP: {entry.gpOutcome}
                            </span>
                          ) : (
                            <span className="m-outcome-pending">Pending</span>
                          )}
                        </td>
                        <td className="text-[13px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{entry.savedAt?.slice(0, 10)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openMemo(entry.id)} className="m-btn-secondary m-btn-sm">
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </WorkspaceSection>
        )}

        {library.length === 0 && <BriefStarters />}
      </WorkspacePage>
    </WorkspaceShell>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
        active ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
      }`}
    >
      {children}
    </button>
  )
}
