'use client'

import { useState } from 'react'
import { getFundProfile } from '@/lib/fund-profile'
import { filterCompaniesNeedingBrief } from '@/lib/memo-library'
import { estimateBatchCost } from '@/lib/cost-estimate'
import { isPowerBatchEnabled, setPowerBatchEnabled } from '@/lib/discover-state'

function FitBadge({ score }) {
  const cls = score >= 80 ? 'm-badge-high' : score >= 60 ? 'm-badge-mid' : 'm-badge-low'
  return <span className={cls}>{score}</span>
}

function confirmBatchBrief(companies) {
  const fund = getFundProfile()
  const needing = filterCompaniesNeedingBrief(companies, { fundId: fund?.id })
  const skipped = companies.length - needing.length

  if (needing.length === 0) {
    window.alert('All selected companies already have recent briefs in your library.')
    return false
  }

  const cost = estimateBatchCost(needing.length)
  const skipNote = skipped > 0 ? `\n\n${skipped} will be skipped (already briefed).` : ''
  return window.confirm(
    `Generate ${needing.length} brief${needing.length === 1 ? '' : 's'} (~$${cost} estimated API cost)?${skipNote}`
  )
}

export default function SourceTable({
  companies,
  onGenerateMemo,
  onBatchBrief,
  onDemote,
  batchRunning,
  demotedCount = 0,
  emptyReason = 'no_matches',
}) {
  const [selected, setSelected] = useState(new Set())
  const [powerBatch, setPowerBatch] = useState(isPowerBatchEnabled())

  function toggle(name) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleAll() {
    setSelected(selected.size === companies.length ? new Set() : new Set(companies.map(c => c.name)))
  }

  function togglePowerBatch() {
    const next = !powerBatch
    setPowerBatch(next)
    setPowerBatchEnabled(next)
  }

  const selectedCompanies = companies.filter(c => selected.has(c.name))

  function handleBatch(companiesToBrief) {
    if (!confirmBatchBrief(companiesToBrief)) return
    onBatchBrief?.(companiesToBrief)
  }

  if (!companies.length) {
    const message = emptyReason === 'all_demoted'
      ? 'All results hidden — restore from discover or run a new search.'
      : emptyReason === 'zero_results'
        ? 'Search returned no companies — try a broader thesis.'
        : 'No companies match filters.'
    return (
      <div className="flex h-40 items-center justify-center px-6 text-center text-[13px]" style={{ color: 'var(--m-muted)' }}>
        {message}
        {demotedCount > 0 && emptyReason !== 'all_demoted' && ` · ${demotedCount} hidden`}
      </div>
    )
  }

  return (
    <div>
      <div className="m-card-header !rounded-none !border-x-0 !border-t-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
            Brief one company at a time — batch is for power users only.
          </p>
          <button type="button" onClick={togglePowerBatch} className="m-btn-ghost m-btn-sm">
            {powerBatch ? 'Hide batch tools' : 'Show batch tools'}
          </button>
        </div>

        {powerBatch && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleBatch(selectedCompanies)}
              disabled={batchRunning || selectedCompanies.length === 0}
              className="m-btn-secondary m-btn-sm"
            >
              Brief selected ({selectedCompanies.length})
            </button>
            <button
              type="button"
              onClick={() => handleBatch(companies.slice(0, 3))}
              disabled={batchRunning}
              className="m-btn-ghost m-btn-sm"
            >
              Brief top 3
            </button>
          </div>
        )}
      </div>

      <div className="m-table-wrap !rounded-none !border-x-0 !border-b-0">
        <table className="m-table">
          <thead>
            <tr>
              {powerBatch && (
                <th className="w-10">
                  <input type="checkbox" checked={selected.size === companies.length} onChange={toggleAll} className="rounded" />
                </th>
              )}
              <th className="w-10">#</th>
              <th>Company</th>
              <th className="w-16">Fit</th>
              <th>Stage</th>
              <th>Geography</th>
              <th>Sector</th>
              <th>Source</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => (
              <tr key={`${c.name}-${i}`} className="group">
                {powerBatch && (
                  <td>
                    <input type="checkbox" checked={selected.has(c.name)} onChange={() => toggle(c.name)} className="rounded" />
                  </td>
                )}
                <td className="font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>{i + 1}</td>
                <td>
                  <div className="font-medium">{c.name}</div>
                  <div className="mt-0.5 max-w-md text-[12px] leading-snug" style={{ color: 'var(--m-muted)' }}>{c.description}</div>
                  <div className="mt-1 text-[11px] italic" style={{ color: 'var(--m-muted-2)' }}>{c.rationale}</div>
                </td>
                <td><FitBadge score={c.fitScore} /></td>
                <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>{c.stage || '—'}</td>
                <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>{c.geography || '—'}</td>
                <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>{c.sector || '—'}</td>
                <td>
                  <span className="m-badge-low uppercase">{c.source}</span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onGenerateMemo(c)}
                      disabled={!c.url && !c.domain}
                      className="m-btn-primary m-btn-sm"
                    >
                      Brief
                    </button>
                    <button
                      type="button"
                      onClick={() => onDemote?.(c)}
                      className="m-btn-ghost m-btn-sm opacity-60 hover:opacity-100"
                      title="Hide from this search"
                    >
                      Hide
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
