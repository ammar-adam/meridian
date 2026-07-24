'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import PageLoader from '@/components/page-loader'
import SourceTable from '@/components/source-table'
import EmptyState from '@/components/empty-state'
import {
  getFundProfile,
  getActiveStrategy,
  resolveApiFundContext,
  hasFundProfile,
} from '@/lib/fund-profile'
import { findMemoByDomain } from '@/lib/memo-library'
import { resolveDiscoverCompanyUrl } from '@/lib/discover-url'
import { canAutogenBrief, isFlowReady } from '@/lib/flow-quality'
import { buildSourceContext } from '@/lib/source-session'
import {
  upsertWatch,
  getWatchForFund,
  annotateFlowCompanies,
  sortFlowCompanies,
  markSeen,
  getLastVisit,
  flowSummary,
} from '@/lib/mandate-watch'
import { coverageSummary } from '@/lib/coverage-proof'
import { reachabilitySummary } from '@/lib/reachability'
import { ledgerSummary } from '@/lib/freshness-ledger'
import FlowDigestCard from '@/components/flow-digest-card'
import FlowWatchAlerts from '@/components/flow-watch-alerts'
import { FLOW_SOURCE_FILTERS, filterBySourceType } from '@/lib/source-type'
import { computeFlowFeedStats } from '@/lib/flow-feed-stats'

function formatVisit(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

function FlowContent() {
  const router = useRouter()
  const [fund, setFund] = useState(null)
  const [watch, setWatch] = useState(null)
  const [companies, setCompanies] = useState(null)
  const [flowMeta, setFlowMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastVisit, setLastVisit] = useState(null)
  const [watching, setWatching] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [briefableOnly, setBriefableOnly] = useState(true)

  const loadContext = useCallback(() => {
    const profile = getFundProfile()
    setFund(profile)
    if (profile) {
      setWatch(getWatchForFund(profile.id))
      setLastVisit(getLastVisit(profile.id))
    } else {
      setWatch(null)
      setLastVisit(null)
    }
  }, [])

  const loadFlow = useCallback(async () => {
    const fundContext = resolveApiFundContext()
    if (!fundContext?.fundName || fundContext.isGuest) {
      setError('Choose a fund to unlock continuous deal flow.')
      setCompanies(null)
      return
    }

    const profile = getFundProfile()
    const strategy = getActiveStrategy(profile)
    const thesis = getWatchForFund(profile?.id)?.thesis
      || strategy?.thesis
      || fundContext.thesis
      || ''

    if (!thesis.trim()) {
      setError('Add a thesis on Fund settings — Flow watches your mandate.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesis: thesis.trim(), fundContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Flow failed')

      const annotated = sortFlowCompanies(
        annotateFlowCompanies(data.companies || [], { fundId: profile.id }),
      )
      setCompanies(annotated)
      setFlowMeta(data.meta || null)
      setLastVisit(getLastVisit(profile.id))
    } catch (err) {
      setError(err.message || 'Failed to load deal flow')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContext()
    const onCtx = () => {
      loadContext()
      loadFlow()
    }
    window.addEventListener('meridian-context-change', onCtx)
    window.addEventListener('meridian-flow-change', loadContext)
    return () => {
      window.removeEventListener('meridian-context-change', onCtx)
      window.removeEventListener('meridian-flow-change', loadContext)
    }
  }, [loadContext, loadFlow])

  useEffect(() => {
    if (hasFundProfile()) loadFlow()
  }, [loadFlow, fund?.id])

  function handleWatch() {
    const profile = getFundProfile()
    const strategy = getActiveStrategy(profile)
    if (!profile || !strategy?.thesis) {
      setError('Configure fund thesis before watching.')
      return
    }
    const w = upsertWatch({
      fundId: profile.id,
      fundName: profile.fundName,
      strategyId: strategy.id,
      strategyName: strategy.name,
      thesis: strategy.thesis,
    })
    setWatch(w)
    setWatching(true)
    // Baseline: everything currently in the feed is "seen" so future cohort adds show as New.
    if (companies?.length) markSeen(profile.id, companies)
    setLastVisit(getLastVisit(profile.id))
    setCompanies(sortFlowCompanies(annotateFlowCompanies(companies || [], { fundId: profile.id })))
    setTimeout(() => setWatching(false), 2000)
  }

  function handleMarkSeen() {
    const profile = getFundProfile()
    if (!profile || !companies) return
    markSeen(profile.id, companies)
    setCompanies(sortFlowCompanies(annotateFlowCompanies(companies, { fundId: profile.id })))
    setLastVisit(getLastVisit(profile.id))
  }

  function briefCompany(company) {
    const url = resolveDiscoverCompanyUrl(company)
    const profile = getFundProfile()
    const strategy = getActiveStrategy(profile)
    const thesis = watch?.thesis || strategy?.thesis || ''

    if (url && canAutogenBrief(company)) {
      sessionStorage.setItem('meridian_source_context', JSON.stringify(buildSourceContext(
        { thesis, meta: { flow: true }, fundId: profile?.id, strategyId: strategy?.id },
        company,
      )))
      const existing = findMemoByDomain(url, profile?.id)
      if (existing) {
        sessionStorage.setItem('memoId', existing.id)
        sessionStorage.setItem('memoSource', 'library')
        router.push('/memo')
        return
      }
      router.push(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
      return
    }

    if (company?.personName || company?.name) {
      sessionStorage.setItem('meridian_source_context', JSON.stringify(buildSourceContext(
        { thesis, meta: { flow: true }, fundId: profile?.id, strategyId: strategy?.id },
        company,
      )))
      const q = new URLSearchParams({
        name: company.name,
        needsDomain: '1',
      })
      if (company.personName) q.set('founder', company.personName)
      router.push(`/brief?${q.toString()}`)
    }
  }

  function handleCompanyUpdate(name, updated) {
    setCompanies(prev => (prev || []).map(c => (c.name === name ? { ...c, ...updated } : c)))
  }

  const summary = useMemo(() => flowSummary(companies || []), [companies])
  const feedStats = useMemo(() => computeFlowFeedStats(companies || []), [companies])
  const coverage = useMemo(() => feedStats.coverage || coverageSummary(companies || []), [companies, feedStats])
  const reach = useMemo(() => feedStats.reach || reachabilitySummary(companies || []), [companies, feedStats])
  const ledger = useMemo(() => feedStats.ledger || ledgerSummary(companies || []), [companies, feedStats])
  const newRows = useMemo(() => (companies || []).filter(c => c.isNew), [companies])
  const filteredRows = useMemo(
    () => filterBySourceType(companies || [], sourceFilter),
    [companies, sourceFilter],
  )
  const feedRows = useMemo(
    () => (briefableOnly ? filteredRows.filter(canAutogenBrief) : filteredRows),
    [filteredRows, briefableOnly],
  )
  const briefReadyCount = useMemo(
    () => (companies || []).filter(canAutogenBrief).length,
    [companies],
  )
  const thesisText = watch?.thesis || getActiveStrategy(fund)?.thesis || ''

  if (!hasFundProfile()) {
    return (
      <WorkspaceShell title="Deal Flow" subtitle="Continuous community sourcing">
        <WorkspacePage width="narrow">
          <EmptyState
            title="Choose a fund to start deal flow"
            description="Meridian watches your mandate against Velocity, DMZ, CDL and other community sources — and surfaces net-new companies between visits. That’s what funds pay for."
            primaryHref="/fund"
            primaryLabel="Choose fund"
            secondaryHref="/fund/setup"
            secondaryLabel="Set up fund"
          />
        </WorkspacePage>
      </WorkspaceShell>
    )
  }

  return (
    <WorkspaceShell
      title="Deal Flow"
      subtitle={
        [
          fund?.fundName,
          summary.total ? `${summary.total} companies` : null,
          coverage.communityFirst ? `${coverage.communityFirst} verified misses` : null,
          (coverage.communitySourced || 0) > 0 ? `${coverage.communitySourced} community-sourced` : null,
          reach.direct ? `${reach.direct} direct-reach` : null,
          summary.newCount ? `${summary.newCount} new` : null,
          lastVisit ? `seen ${formatVisit(lastVisit)}` : 'first check',
        ].filter(Boolean).join(' · ')
      }
      actions={(
        <div className="flex flex-wrap gap-2">
          {watch ? (
            <span className="m-btn-ghost m-btn-sm text-[color:var(--m-accent)]">Watching mandate</span>
          ) : (
            <button type="button" onClick={handleWatch} className="m-btn-primary m-btn-sm">
              {watching ? 'Watching…' : 'Watch this mandate'}
            </button>
          )}
          <button type="button" onClick={loadFlow} disabled={loading} className="m-btn-ghost m-btn-sm">
            Refresh
          </button>
          {summary.newCount > 0 && (
            <button type="button" onClick={handleMarkSeen} className="m-btn-secondary m-btn-sm">
              Mark all seen
            </button>
          )}
        </div>
      )}
    >
      <WorkspacePage width="wide">
        <div className="m-flow-hero mb-6">
          <p className="m-kicker mb-1">Data wedge</p>
          <h2 className="text-[20px] font-semibold tracking-tight text-[color:var(--m-text)]">
            Companies matched to your mandate — with receipts.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
            Ranked by thesis overlap, stage, and freshness. Fit scores show why a company matched.
            We only claim index absence where a dated check exists.
          </p>
          {flowMeta?.coverageBanner && (
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
              <p className="text-[13px] font-semibold text-amber-200">{flowMeta.coverageBanner.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-amber-100/90">{flowMeta.coverageBanner.detail}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-amber-100/70">{flowMeta.coverageBanner.expanding}</p>
            </div>
          )}
          {flowMeta?.thinRowsHidden > 0 && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--m-muted-2)' }}>
              {flowMeta.thinRowsHidden} thin rows hidden (no domain or founder) — expand sources or add domains to brief them.
            </p>
          )}
          {feedRows.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="m-stat-pill m-stat-pill-success">
                {(coverage.communitySourced || 0) + (coverage.communityFirst || 0)}/{coverage.total} community-sourced
              </span>
              <span className="m-stat-pill">
                {Math.round((reach.rate || 0) * 100)}% direct-reach{reach.searchOnly ? ` · ${reach.searchOnly} LinkedIn search` : ''}
              </span>
              <span className="m-stat-pill">{ledger.withFirstSeen} with first-seen dates</span>
              {ledger.verifiedMiss > 0 && (
                <span className="m-stat-pill m-stat-pill-accent">{ledger.verifiedMiss} verified index misses</span>
              )}
              {flowMeta?.match?.strongMatches != null && (
                <span className="m-stat-pill">{flowMeta.match.strongMatches} strong matches</span>
              )}
              {ledger.medianAgeDays != null && (
                <span className="m-stat-pill">median {ledger.medianAgeDays}d fresh</span>
              )}
            </div>
          )}
          {!watch && (
            <button type="button" onClick={handleWatch} className="m-btn-primary mt-4">
              Watch {fund?.fundName || 'mandate'}
            </button>
          )}
        </div>

        {flowMeta?.watchEvents?.length > 0 && (
          <FlowWatchAlerts
            watchEvents={flowMeta.watchEvents}
            webhooks={flowMeta.webhooks}
          />
        )}

        {feedRows.length > 0 && (
          <FlowDigestCard
            fundName={fund?.fundName || 'Fund'}
            thesis={thesisText}
            companies={companies || []}
            feedStats={feedStats}
          />
        )}

        {companies?.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[12px]" style={{ color: 'var(--m-muted)' }}>Source filter</span>
            {FLOW_SOURCE_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSourceFilter(f.id)}
                className={sourceFilter === f.id ? 'm-btn-primary m-btn-sm' : 'm-btn-ghost m-btn-sm'}
              >
                {f.label}
              </button>
            ))}
            <span className="mx-1 text-[color:var(--m-muted-2)]">|</span>
            <button
              type="button"
              onClick={() => setBriefableOnly(v => !v)}
              className={briefableOnly ? 'm-btn-primary m-btn-sm' : 'm-btn-ghost m-btn-sm'}
              title="Hide founder-only rows that need a domain before Brief"
            >
              Brief-ready ({briefReadyCount})
            </button>
            {(sourceFilter !== 'all' || briefableOnly) && feedRows.length !== companies.length && (
              <span className="text-[12px]" style={{ color: 'var(--m-muted-2)' }}>
                {feedRows.length} of {companies.length} shown
              </span>
            )}
          </div>
        )}

        {error && <p className="m-alert-error mb-4">{error}</p>}

        {loading && !companies && (
          <div className="m-loader">
            <div className="m-loader-bar"><div /></div>
            <p className="text-[13px] font-medium">Loading deal flow</p>
          </div>
        )}

        {summary.newCount > 0 && (
          <WorkspaceSection
            title={`${summary.newCount} new since last visit`}
            description="Mark seen when you’ve skimmed — next visit only shows true deltas."
          >
            <div className="m-card overflow-hidden m-magic-table">
              <SourceTable
                companies={newRows}
                onGenerateMemo={briefCompany}
                onCompanyUpdate={handleCompanyUpdate}
                batchRunning={false}
                emptyReason="No new companies"
                fundName={fund?.fundName}
                thesis={thesisText}
              />
            </div>
          </WorkspaceSection>
        )}

        {feedRows.length > 0 && (
          <WorkspaceSection
            title={summary.newCount > 0 ? 'Full mandate feed' : 'Your mandate feed'}
            description={watch?.thesis?.slice(0, 160) || 'Community companies matching this fund'}
          >
            <div className="m-card overflow-hidden m-magic-table">
              <SourceTable
                companies={feedRows}
                onGenerateMemo={briefCompany}
                onCompanyUpdate={handleCompanyUpdate}
                batchRunning={false}
                fundName={fund?.fundName}
                thesis={thesisText}
              />
            </div>
          </WorkspaceSection>
        )}

        {!loading && companies?.length === 0 && (
          <EmptyState
            title="No community matches yet"
            description="Expand your thesis geography toward Canada / Ontario, or run Discover for a broader search."
            primaryHref="/discover"
            primaryLabel="Open Discover"
            secondaryHref="/fund"
            secondaryLabel="Edit mandate"
          />
        )}

        <p className="mt-8 text-center text-[12px]" style={{ color: 'var(--m-muted-2)' }}>
          Prefer a one-off search?{' '}
          <Link href="/discover" className="font-medium text-[color:var(--m-accent)] hover:underline">Discover →</Link>
        </p>
      </WorkspacePage>
    </WorkspaceShell>
  )
}

export default function FlowPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <FlowContent />
    </Suspense>
  )
}
