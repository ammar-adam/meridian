'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import EmptyState from '@/components/empty-state'
import BriefStarters from '@/components/brief-starters'
import { FundSwitcher, StrategySwitcher } from '@/components/context-switcher'
import { downloadLibraryCsv } from '@/lib/crm-export'
import { getMemoLibrary, getRelatedMemos } from '@/lib/memo-library'
import { getFundProfile, getAllFunds } from '@/lib/fund-profile'

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
  const [filter, setFilter] = useState('active')
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const router = useRouter()

  function reload() {
    setLibrary(getMemoLibrary())
  }

  useEffect(() => {
    reload()
    window.addEventListener('meridian-context-change', reload)
    return () => window.removeEventListener('meridian-context-change', reload)
  }, [])

  const profile = getFundProfile()
  const funds = getAllFunds()

  const scoped = useMemo(() => {
    if (filter === 'all') return library
    if (filter === 'active' && profile) {
      return library.filter(e => e.fundId === profile.id && e.strategyId === profile.activeStrategyId)
    }
    if (filter.startsWith('fund:')) {
      const fundId = filter.slice(5)
      return library.filter(e => e.fundId === fundId)
    }
    return library
  }, [library, filter, profile])

  const filtered = useMemo(() => {
    let rows = scoped
    if (outcomeFilter === 'pending') rows = rows.filter(e => !e.outcome)
    if (outcomeFilter === 'pursue') rows = rows.filter(e => e.outcome === 'pursue')
    if (outcomeFilter === 'pass') rows = rows.filter(e => e.outcome === 'pass')
    return sortLibrary(rows)
  }, [scoped, outcomeFilter])

  const pending = scoped.filter(e => !e.outcome).length

  function openMemo(id) {
    const entry = library.find(e => e.id === id)
    if (!entry) return
    sessionStorage.setItem('memoData', JSON.stringify(entry.data))
    sessionStorage.setItem('memoSource', 'library')
    sessionStorage.setItem('memoId', entry.id)
    sessionStorage.removeItem('qualityGate')
    if (entry.trackingId) {
      sessionStorage.setItem('memoMeta', JSON.stringify({
        fundId: entry.fundId,
        fundName: entry.fundName,
        strategyId: entry.strategyId,
        strategyName: entry.strategyName,
        trackingId: entry.trackingId,
        searchThesis: entry.sourceThesis,
        companyDomain: entry.companyDomain,
      }))
    }
    router.push('/memo')
  }

  return (
    <WorkspaceShell
      title="Library"
      subtitle={scoped.length ? `${scoped.length} briefs · ${pending} awaiting review` : 'Saved briefs'}
      actions={
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button type="button" onClick={() => downloadLibraryCsv('meridian-briefs.csv', filtered)} className="m-btn-secondary m-btn-sm">
              Export CSV
            </button>
          )}
          <button type="button" onClick={() => router.push('/lists')} className="m-btn-ghost m-btn-sm">
            Batch list
          </button>
          <FundSwitcher onChange={reload} />
          <StrategySwitcher onChange={reload} />
        </div>
      }
    >
      <WorkspacePage width="wide">
        {pending > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            <span className="font-medium">{pending} brief{pending !== 1 ? 's' : ''} need review.</span>
            {' '}Pursue/pass signals train your thesis band.
            {outcomeFilter !== 'pending' && (
              <button type="button" onClick={() => setOutcomeFilter('pending')} className="ml-2 font-medium underline">
                Show pending
              </button>
            )}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip active={filter === 'active'} onClick={() => setFilter('active')}>Active strategy</FilterChip>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All briefs</FilterChip>
          {funds.length > 1 && funds.map(f => (
            <FilterChip key={f.id} active={filter === `fund:${f.id}`} onClick={() => setFilter(`fund:${f.id}`)}>
              {f.fundName}
            </FilterChip>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip active={outcomeFilter === 'all'} onClick={() => setOutcomeFilter('all')}>All outcomes</FilterChip>
          <FilterChip active={outcomeFilter === 'pending'} onClick={() => setOutcomeFilter('pending')}>
            Needs review{pending > 0 ? ` (${pending})` : ''}
          </FilterChip>
          <FilterChip active={outcomeFilter === 'pursue'} onClick={() => setOutcomeFilter('pursue')}>Pursue</FilterChip>
          <FilterChip active={outcomeFilter === 'pass'} onClick={() => setOutcomeFilter('pass')}>Pass</FilterChip>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No briefs in this view"
            description="Generate from any company URL — or open the NationGraph demo to see the quality bar instantly."
            primaryHref="/brief"
            primaryLabel="Generate a brief"
            steps={[
              { label: 'Paste company URL', desc: 'Works without fund setup' },
              { label: 'Pursue or pass', desc: 'Close the loop on every memo' },
              { label: 'Personalize fund', desc: 'Thesis band gets fund-specific' },
            ]}
          />
        ) : (
          <WorkspaceSection title="Briefs" description="Pending review first. Same company under different funds appears as separate rows.">
            <div className="m-table-wrap">
              <table className="m-table !min-w-0">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Domain</th>
                    <th>Fund / Strategy</th>
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
                        <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
                          {entry.fundName || '—'}
                          {entry.strategyName && entry.strategyName !== 'Primary' && (
                            <span className="block text-[11px]">{entry.strategyName}</span>
                          )}
                        </td>
                        <td className="text-[13px]" style={{ color: 'var(--m-muted)' }}>{entry.round}</td>
                        <td>
                          {entry.outcome ? (
                            <span className={entry.outcome === 'pursue' ? 'm-outcome-pursue' : 'm-outcome-pass'}>{entry.outcome}</span>
                          ) : (
                            <span className="m-outcome-pending">Needs review</span>
                          )}
                        </td>
                        <td className="text-[13px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{entry.savedAt?.slice(0, 10)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openMemo(entry.id)} className="m-btn-secondary m-btn-sm">
                            {entry.outcome ? 'Open' : 'Review'}
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
