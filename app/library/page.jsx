'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import EmptyState from '@/components/empty-state'
import { downloadLibraryCsv, copyLibraryRowForCrm } from '@/lib/crm-export'
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
  const [qualityFilter, setQualityFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [sharing, setSharing] = useState(false)
  const [crmCopiedId, setCrmCopiedId] = useState(null)
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
    if (qualityFilter === 'flags') {
      rows = rows.filter(e => (e.qualityWarnCount || 0) > 0 || (e.qualityErrorCount || 0) > 0 || e.qualityPassed === false)
    }
    if (qualityFilter === 'clean') {
      rows = rows.filter(e => e.qualityPassed === true || ((e.qualityWarnCount || 0) === 0 && (e.qualityErrorCount || 0) === 0 && e.qualityPassed !== false))
    }
    return sortLibrary(rows)
  }, [library, outcomeFilter, qualityFilter])

  const flagged = library.filter(e => (e.qualityWarnCount || 0) > 0 || (e.qualityErrorCount || 0) > 0 || e.qualityPassed === false).length

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

  async function copyForCrm(entry, e) {
    e?.stopPropagation()
    await copyLibraryRowForCrm(entry)
    setCrmCopiedId(entry.id)
    setTimeout(() => setCrmCopiedId(null), 2000)
  }

  function qualityLabel(entry) {
    if (entry.qualityErrorCount > 0) return { text: 'Needs fix', cls: 'text-red-300' }
    if (entry.qualityWarnCount > 0) return { text: `${entry.qualityWarnCount} flag${entry.qualityWarnCount !== 1 ? 's' : ''}`, cls: 'text-amber-300' }
    if (entry.qualityPassed === true) return { text: 'Verified', cls: 'text-[color:var(--m-accent)]' }
    return { text: '—', cls: 'text-[color:var(--m-muted)]' }
  }

  function statusLabel(entry) {
    if (entry.outcome) return 'Reviewed'
    return 'Ready'
  }

  return (
    <div data-testid="library-page">
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
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
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
          <span className="mx-1 w-px self-stretch bg-white/10" aria-hidden />
          <FilterChip active={qualityFilter === 'all'} onClick={() => setQualityFilter('all')}>Any quality</FilterChip>
          <FilterChip active={qualityFilter === 'flags'} onClick={() => setQualityFilter('flags')}>
            Quality flags{flagged > 0 ? ` (${flagged})` : ''}
          </FilterChip>
          <FilterChip active={qualityFilter === 'clean'} onClick={() => setQualityFilter('clean')}>Clean</FilterChip>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No briefs yet"
            description="Paste a company URL on Brief, or run Discover against your fund thesis and brief the best fits."
            primaryHref="/brief"
            primaryLabel="Generate a brief"
            secondaryHref="/discover"
            secondaryLabel="Discover companies"
            steps={[
              { label: 'Confirm your fund', desc: 'Thesis and portfolio drive every memo' },
              { label: 'Brief or Discover', desc: 'Known URL, or thesis-ranked companies' },
              { label: 'Pursue or pass', desc: 'Outcomes land here and feed Learn' },
            ]}
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
                    <th>Quality</th>
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
                        <td className={`text-[12px] font-medium ${qualityLabel(entry).cls}`}>{qualityLabel(entry).text}</td>
                        <td className="text-[13px]" style={{ color: 'var(--m-muted)' }}>{entry.round}</td>
                        <td>
                          {entry.outcome ? (
                            <span className={entry.outcome === 'pursue' ? 'm-outcome-pursue' : 'm-outcome-pass'}>{entry.outcome}</span>
                          ) : entry.gpOutcome ? (
                            <span className="text-[12px] text-[color:var(--m-accent)]" title={entry.gpReviewer ? `GP: ${entry.gpReviewer}` : ''}>
                              GP: {entry.gpOutcome}
                            </span>
                          ) : (
                            <span className="m-outcome-pending">Pending</span>
                          )}
                        </td>
                        <td className="text-[13px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{entry.savedAt?.slice(0, 10)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => copyForCrm(entry, e)}
                              className="m-btn-ghost m-btn-sm"
                              title="Copy plain-text brief for CRM paste"
                            >
                              {crmCopiedId === entry.id ? 'Copied!' : 'CRM'}
                            </button>
                            <button onClick={() => openMemo(entry.id)} className="m-btn-secondary m-btn-sm">
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </WorkspaceSection>
        )}
      </WorkspacePage>
    </WorkspaceShell>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
        active ? 'bg-[color:var(--m-accent)] text-white' : 'ring-1 ring-[color:var(--m-border)] hover:bg-[color:var(--m-surface-2)]'
      }`}
      style={active ? undefined : { background: 'var(--m-surface-2)', color: 'var(--m-muted)' }}
    >
      {children}
    </button>
  )
}
