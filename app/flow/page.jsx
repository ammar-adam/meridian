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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastVisit, setLastVisit] = useState(null)
  const [watching, setWatching] = useState(false)

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
    if (!url) return
    const profile = getFundProfile()
    const strategy = getActiveStrategy(profile)
    const thesis = watch?.thesis || strategy?.thesis || ''
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
  }

  const summary = useMemo(() => flowSummary(companies || []), [companies])
  const newRows = useMemo(() => (companies || []).filter(c => c.isNew), [companies])
  const feedRows = companies || []

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
          summary.newCount ? `${summary.newCount} new` : null,
          summary.freshCount ? `${summary.freshCount} fresh cohorts` : null,
          lastVisit ? `seen ${formatVisit(lastVisit)}` : 'first check',
        ].filter(Boolean).join(' · ')
      }
      actions={(
        <div className="flex flex-wrap gap-2">
          {watch ? (
            <span className="m-btn-ghost m-btn-sm text-emerald-700">Watching mandate</span>
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
          <p className="m-kicker mb-1">Why teams subscribe</p>
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900">
            Net-new Canadian companies against your thesis — before Harmonic indexes them.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-zinc-600">
            Flow is the product: continuous community deal flow with founders, domains, and provenance.
            Briefs are how you forward a company. Watch your mandate once — come back for what&apos;s new.
          </p>
          {!watch && (
            <button type="button" onClick={handleWatch} className="m-btn-primary mt-4">
              Watch {fund?.fundName || 'mandate'}
            </button>
          )}
        </div>

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
                batchRunning={false}
                emptyReason="No new companies"
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
                batchRunning={false}
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

        <p className="mt-8 text-center text-[12px] text-zinc-500">
          Prefer a one-off search?{' '}
          <Link href="/discover" className="font-medium text-zinc-800 hover:underline">Discover →</Link>
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
