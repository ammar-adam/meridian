'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import PageLoader from '@/components/page-loader'
import { flowFeedStatsLine } from '@/lib/flow-feed-stats'

export default function PilotPage() {
  const [study, setStudy] = useState(null)
  const [benchmark, setBenchmark] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/pilot')
      .then(r => r.json())
      .then(setStudy)
      .catch(err => setError(err.message || 'Failed to load pilot'))
    fetch('/api/benchmark')
      .then(r => r.json())
      .then(d => { if (d?.enabled) setBenchmark(d) })
      .catch(() => {})
  }, [])

  if (!study && !error) {
    return (
      <WorkspaceShell title="Coverage proof" subtitle="The data wedge, measured">
        <PageLoader />
      </WorkspaceShell>
    )
  }

  if (error || !study) {
    return (
      <WorkspaceShell title="Coverage proof" subtitle="The data wedge, measured">
        <WorkspacePage width="narrow">
          <p className="m-alert-error">{error || 'Unavailable'}</p>
        </WorkspacePage>
      </WorkspaceShell>
    )
  }

  const m = study.metrics
  const headline = study.headlineMetrics || benchmark?.stats
  const feedStats = benchmark?.feedParity?.feedStats
  const bulkFill = study.bulkFill
  const useLedgerHeadline = Boolean(headline?.companyRecords != null || headline?.entitiesChecked != null)

  return (
    <WorkspaceShell
      title="Coverage proof"
      subtitle={`${study.fund} · ${study.window}`}
      actions={(
        <Link href={study.cta.href} className="m-btn-primary m-btn-sm">
          {study.cta.label}
        </Link>
      )}
    >
      <WorkspacePage width="medium">
        <div className="mb-8">
          <p className="m-kicker mb-1">Coverage, measured — not claimed</p>
          <h2 className="text-[24px] font-semibold tracking-tight text-zinc-900">{study.title}</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-600">
            {study.thesis}
          </p>
        </div>

        {(feedStats || bulkFill?.ran) && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
            <p className="text-[13px] font-semibold text-emerald-950">Live feed parity</p>
            {feedStats && (
              <p className="mt-1 text-[13px] text-emerald-900">
                {flowFeedStatsLine(feedStats)}
                {benchmark?.feedParity?.mandate ? ` · mandate: ${benchmark.feedParity.mandate}` : ''}
              </p>
            )}
            {bulkFill?.ran && (
              <p className="mt-1 font-mono text-[12px] text-emerald-800">
                Corpus pump: +{bulkFill.delta ?? 0} records → {bulkFill.after ?? '—'} (target {bulkFill.target ?? 2500})
              </p>
            )}
          </div>
        )}

        {useLedgerHeadline && (
          <p className="mb-3 text-[12px] font-medium text-zinc-600">
            Headline metrics from the live truth ledger — same source as Coverage proof and Deal Flow digest.
          </p>
        )}

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {useLedgerHeadline ? (
            <>
              <Stat label="Company records" value={headline.companyRecords ?? '—'} />
              <Stat label="Index-checked" value={headline.entitiesChecked ?? '—'} />
              <Stat label="Verified misses (dated)" value={headline.verifiedMisses ?? m.verifiedMiss ?? 0} />
              <Stat label="Entities on ledger" value={headline.entities ?? '—'} />
              <Stat label="Flow-ready (community layer)" value={m.flowReady} />
              <Stat label="Community-sourced" value={`${(m.communitySourced || 0) + (m.communityFirst || 0)} (${Math.round((m.communityShare || 0) * 100)}%)`} />
              <Stat label="Direct-reach" value={`${m.reachable} (${Math.round((m.reachRate || 0) * 100)}%)`} />
              <Stat label="Median freshness" value={m.medianAgeDays != null ? `${m.medianAgeDays}d` : '—'} />
            </>
          ) : (
            <>
              <Stat label="Cohort companies" value={m.cohortCompanies} />
              <Stat label="Flow-ready" value={m.flowReady} />
              <Stat label="Community-sourced" value={`${(m.communitySourced || 0) + (m.communityFirst || 0)} (${Math.round(m.communityShare * 100)}%)`} />
              <Stat label="Direct-reach" value={`${m.reachable} (${Math.round(m.reachRate * 100)}%)`} />
              <Stat label="With first-seen date" value={m.withFirstSeen} />
              <Stat label="Verified index misses" value={m.verifiedMiss} />
              <Stat label="Founder handle" value={`${Math.round((m.founderRate || 0) * 100)}%`} />
              <Stat label="Median freshness" value={m.medianAgeDays != null ? `${m.medianAgeDays}d` : '—'} />
            </>
          )}
        </div>

        <WorkspaceSection title="Measured loop" description={study.thesisBandNote}>
          <ol className="space-y-3">
            {study.loop.map((step, i) => (
              <li key={step.step} className="flex gap-3 text-[14px]">
                <span className="font-mono text-[11px] text-zinc-400">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="font-medium text-zinc-900">{step.step}</div>
                  <div className="text-[13px] text-zinc-600">{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        </WorkspaceSection>

        <WorkspaceSection
          title="Falsifiable coverage"
          description={m.falsifiableLabel}
        >
          <div className="m-card overflow-hidden">
            <table className="m-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Founders</th>
                  <th>First seen</th>
                  <th>Coverage (checkable)</th>
                  <th>Reach</th>
                </tr>
              </thead>
              <tbody>
                {study.proofCompanies.map(c => (
                  <tr key={c.name}>
                    <td>
                      <div className="font-medium">{c.name}</div>
                      <div className="font-mono text-[11px] text-zinc-500">{c.domain}</div>
                    </td>
                    <td className="text-[12px] text-zinc-700">{c.founders || '—'}</td>
                    <td className="font-mono text-[11px]">{c.cohortDate || '—'}</td>
                    <td className="text-[12px] text-emerald-800">{c.coverage}</td>
                    <td>
                      {c.linkedin ? (
                        <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-[12px] text-sky-800 hover:underline">
                          LinkedIn
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            &ldquo;First seen&rdquo; is the community cohort announcement date (cited in each row&rsquo;s provenance).
            A verified index miss means we ran a StartupHub name search and it returned no match — you can repeat it.
            We do not assert index absence for rows we haven&rsquo;t tested.
          </p>
        </WorkspaceSection>

        {benchmark?.stats && (
          <WorkspaceSection
            title="Live truth ledger"
            description="Server-side observation record — accrues from launch, never backdated"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Entities on ledger" value={benchmark.stats.entities} />
              <Stat
                label="Ledger since"
                value={benchmark.stats.ledgerSince ? String(benchmark.stats.ledgerSince).slice(0, 10) : '—'}
              />
              <Stat label="Index-checked" value={benchmark.stats.entitiesChecked} />
              <Stat label="Verified misses (dated)" value={benchmark.stats.verifiedMisses} />
              <Stat label="Pre-announcement signals" value={benchmark.stats.preAnnouncementSignals ?? 0} />
              <Stat label="Company records" value={benchmark.stats.companyRecords ?? '—'} />
              <Stat label="Registered sources" value={benchmark.stats.registeredSources ?? '—'} />
              <Stat
                label="Founder claims"
                value={`${benchmark.attestations?.confirmed ?? 0} confirmed · ${benchmark.attestations?.pending ?? 0} pending`}
              />
            </div>
            {feedStats && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-[12px] font-medium text-zinc-800">Flow feed stats (same builder as Deal Flow digest)</p>
                <p className="mt-1 font-mono text-[12px] text-zinc-600">{flowFeedStatsLine(feedStats)}</p>
              </div>
            )}
            <p className="mt-2 text-[11px] text-zinc-500">
              &ldquo;On Meridian since&rdquo; is when our server first recorded the company — separate from the
              cohort announcement date. Index checks are stored name searches with dates
              ({(benchmark.stats.indexes || []).join(', ') || 'StartupHub'}); we only claim absence where a dated check exists.
            </p>
            {benchmark.sourceWatches?.length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] font-medium text-zinc-800">Source freshness (watched automatically)</p>
                <div className="mt-2 space-y-1">
                  {benchmark.sourceWatches.map(w => (
                    <div key={w.url} className="flex flex-wrap items-baseline gap-x-3 text-[12px]">
                      <span className="text-zinc-700">{w.label}</span>
                      <span className="font-mono text-[11px] text-zinc-500">
                        checked {relativeTime(w.lastCheckedAt)}
                        {w.lastChangedAt ? ` · changed ${relativeTime(w.lastChangedAt)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </WorkspaceSection>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/earliness" className="m-btn-secondary">Earliness scoreboard</Link>
          <Link href="/flow" className="m-btn-primary">Open Deal Flow</Link>
          <Link href="/fund" className="m-btn-secondary">Choose fund &amp; watch</Link>
          <Link href="/claim" className="m-btn-secondary">Founder? Claim your profile</Link>
        </div>
      </WorkspacePage>
    </WorkspaceShell>
  )
}

function relativeTime(iso) {
  const t = Date.parse(iso || '')
  if (Number.isNaN(t)) return '—'
  const mins = Math.floor((Date.now() - t) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-tight text-zinc-900">{value}</div>
    </div>
  )
}
