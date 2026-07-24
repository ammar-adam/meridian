'use client'

import { useState } from 'react'
import { getFundProfile } from '@/lib/fund-profile'
import { filterCompaniesNeedingBrief } from '@/lib/memo-library'
import { estimateBatchCost } from '@/lib/cost-estimate'
import { isPowerBatchEnabled, setPowerBatchEnabled } from '@/lib/discover-state'
import CoverageProof from '@/components/coverage-proof'
import ReachabilityActions from '@/components/reachability-actions'
import DeepDiveLinks from '@/components/deep-dive-links'
import SourceTypeBadge from '@/components/source-type-badge'
import ProofPacketActions from '@/components/proof-packet-actions'
import { copyCompanyForCrm, downloadFlowCsv } from '@/lib/crm-export'
import { canAutogenBrief, isFlowReady } from '@/lib/flow-quality'

function FitBadge({ score, reasons }) {
  const cls = score >= 80 ? 'm-badge-high' : score >= 60 ? 'm-badge-mid' : 'm-badge-low'
  const title = Array.isArray(reasons) && reasons.length
    ? reasons.join(' · ')
    : score != null ? `Fit ${score}` : ''
  return <span className={cls} title={title}>{score ?? '—'}</span>
}

function LearnedBadge({ behavioral }) {
  if (!behavioral?.label) return null
  const cls = behavioral.label === 'Lean in'
    ? 'm-badge-high'
    : behavioral.label === 'Downranked' || behavioral.label === 'Demoted'
      ? 'm-badge-low'
      : 'm-badge-mid'
  return (
    <span className={`${cls} ml-1`} title={behavioral.reason || ''}>
      {behavioral.label}
    </span>
  )
}

function SourceBadge({ source, unverified, sourceConfidence }) {
  return (
    <SourceTypeBadge
      source={source}
      unverified={unverified}
      sourceConfidence={sourceConfidence}
    />
  )
}

function ProvenanceLine({ provenance, sourceConfidence, source, personName }) {
  if (!provenance && !personName) return null
  const tone = sourceConfidence === 'high'
    ? 'text-[color:var(--m-accent)]'
    : sourceConfidence === 'low' || source === 'domain_registry'
      ? 'text-amber-300'
      : 'text-[color:var(--m-muted)]'
  return (
    <div className={`mt-1 text-[11px] font-medium leading-snug ${tone}`} title="Source provenance">
      {personName ? (
        <div className="text-[color:var(--m-muted)]">
          Founders: {personName}
        </div>
      ) : null}
      {provenance || null}
    </div>
  )
}

function SerialFounderBadge({ company }) {
  if (!company?.serialFounder) return null
  const prior = company.priorCompanies?.length
    ? ` — also at ${company.priorCompanies.slice(0, 2).join(', ')}`
    : ''
  return (
    <span
      className="ml-1.5 inline-flex rounded border border-[color:var(--m-accent-line)] bg-[color:var(--m-accent-soft)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[color:var(--m-accent)]"
      title={`Serial founder${prior}`}
    >
      Serial
    </span>
  )
}

function FlowBadge({ company }) {
  if (company?.isNew || company?.flowBadge === 'new') {
    return (
      <span className="ml-1.5 inline-flex rounded border border-[color:var(--m-accent-line)] bg-[color:var(--m-accent-soft)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[color:var(--m-accent)]">
        New
      </span>
    )
  }
  if (company?.isFresh || company?.flowBadge === 'fresh') {
    return (
      <span className="ml-1.5 inline-flex rounded border border-sky-400/40 bg-sky-400/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-sky-300">
        Fresh
      </span>
    )
  }
  return null
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
  onCompanyUpdate,
  batchRunning,
  demotedCount = 0,
  emptyReason = 'no_matches',
  fundName = '',
  thesis = '',
  showExport = true,
}) {
  const [selected, setSelected] = useState(new Set())
  const [powerBatch, setPowerBatch] = useState(isPowerBatchEnabled())
  const [copiedCrm, setCopiedCrm] = useState(null)
  const [enriching, setEnriching] = useState(null)

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

  async function handleEnrichEmail(company) {
    const domain = (company.domain || company.url || '').replace(/^https?:\/\//, '').split('/')[0]
    if (!domain || !domain.includes('.')) {
      window.alert('Add a domain before verified email lookup.')
      return
    }
    setEnriching(company.name)
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, company }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enrichment failed')
      if (!data.enrichment?.enabled) {
        window.alert('Hunter.io not configured — set HUNTER_API_KEY on Vercel.')
        return
      }
      if (!data.enrichment?.emails?.length) {
        window.alert(data.enrichment.error || 'No verified emails found for this domain.')
        return
      }
      if (data.company) onCompanyUpdate?.(company.name, data.company)
    } catch (err) {
      window.alert(err.message || 'Enrichment failed')
    } finally {
      setEnriching(null)
    }
  }

  function handleBatch(companiesToBrief) {
    const briefable = companiesToBrief.filter(canAutogenBrief)
    if (!briefable.length) {
      window.alert('Selected rows need a live domain before batch brief — add a website first.')
      return
    }
    if (!confirmBatchBrief(briefable)) return
    onBatchBrief?.(briefable)
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
        {showExport && companies.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadFlowCsv(companies)}
              className="m-btn-secondary m-btn-sm"
              title="Export Affinity-ready CSV with proof columns"
            >
              Export CSV
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
              <th className="w-28">Fit</th>
              <th>Stage</th>
              <th>Geography</th>
              <th>Sector</th>
              <th>Source</th>
              <th className="w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => {
              const briefable = canAutogenBrief(c)
              const flowReady = isFlowReady(c)
              return (
              <tr key={`${c.name}-${i}`} className="group">
                {powerBatch && (
                  <td>
                    <input type="checkbox" checked={selected.has(c.name)} onChange={() => toggle(c.name)} className="rounded" />
                  </td>
                )}
                <td className="font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>{i + 1}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onGenerateMemo(c)}
                      disabled={!flowReady}
                      className="text-left font-medium hover:underline disabled:opacity-50"
                      title={briefable ? (c.domain || c.url || 'Brief') : flowReady ? 'Add a domain to brief this company' : 'No domain or founder'}
                    >
                      {c.name}
                    </button>
                    <FlowBadge company={c} />
                    <SerialFounderBadge company={c} />
                  </div>
                  {(c.domain || c.url) && (
                    <div className="mt-0.5 font-mono text-[11px]" style={{ color: 'var(--m-muted-2)' }}>
                      {(c.domain || c.url).replace(/^https?:\/\//, '').split('/')[0]}
                    </div>
                  )}
                  <div className="mt-0.5 max-w-md text-[12px] leading-snug" style={{ color: 'var(--m-muted)' }}>{c.description}</div>
                  <ProvenanceLine
                    provenance={c.provenance}
                    sourceConfidence={c.sourceConfidence}
                    source={c.source}
                    personName={c.personName}
                  />
                  <CoverageProof coverage={c.coverage} ledger={c.ledger} stage={c.stage} />
                  <ReachabilityActions reach={c.reach} company={c} compact />
                  <DeepDiveLinks company={c} compact />
                  <ProofPacketActions company={c} fundName={fundName} thesis={thesis} compact />
                  <div className="mt-1 text-[11px] italic" style={{ color: 'var(--m-muted-2)' }}>{c.rationale}</div>
                </td>
                <td>
                  <FitBadge score={c.fitScore} reasons={c.matchReasons} />
                  <LearnedBadge behavioral={c.behavioral} />
                  {Array.isArray(c.matchReasons) && c.matchReasons.length > 0 && (
                    <div className="mt-1 max-w-[10rem] text-[10px] leading-snug" style={{ color: 'var(--m-muted-2)' }}>
                      {c.matchReasons.slice(0, 2).join(' · ')}
                    </div>
                  )}
                </td>
                <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>{c.stage || '—'}</td>
                <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>{c.geography || '—'}</td>
                <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>{c.sector || '—'}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    <SourceBadge source={c.source} unverified={c.unverified} sourceConfidence={c.sourceConfidence} />
                    <CoverageProof coverage={c.coverage} ledger={c.ledger} compact />
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onGenerateMemo(c)}
                      disabled={!flowReady}
                      className="m-btn-primary m-btn-sm"
                      title={briefable ? 'Generate brief' : flowReady ? 'Add domain on Brief page' : 'Needs domain or founder'}
                    >
                      {briefable ? 'Brief' : flowReady ? 'Add domain' : '—'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await copyCompanyForCrm(c)
                          setCopiedCrm(c.name)
                          setTimeout(() => setCopiedCrm(null), 1500)
                        } catch { /* clipboard blocked */ }
                      }}
                      className="m-btn-ghost m-btn-sm opacity-70 hover:opacity-100"
                      title="Copy company for CRM / Affinity"
                    >
                      {copiedCrm === c.name ? 'Copied' : 'CRM'}
                    </button>
                    {c.domain && !c.reach?.primaryEmail && (
                      <button
                        type="button"
                        onClick={() => handleEnrichEmail(c)}
                        disabled={enriching === c.name}
                        className="m-btn-ghost m-btn-sm opacity-70 hover:opacity-100"
                        title="Look up verified emails via Hunter.io"
                      >
                        {enriching === c.name ? '…' : 'Email'}
                      </button>
                    )}
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
            )})}
          </tbody>
        </table>
      </div>
    </div>
  )
}
