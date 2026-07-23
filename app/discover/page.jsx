'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import WorkspaceShell from '@/components/workspace-shell'
import SourceTable from '@/components/source-table'
import BatchProgressPanel from '@/components/batch-progress-panel'
import FilterBar from '@/components/filter-bar'
import PageLoader from '@/components/page-loader'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import {
  saveSourceResults,
  loadSourceResults,
  consumePendingThesis,
  buildSourceContext,
} from '@/lib/source-session'
import { getFundProfile, getActiveStrategy, resolveApiFundContext, getTrackingId } from '@/lib/fund-profile'
import { findMemoByDomain } from '@/lib/memo-library'
import { resolveDiscoverCompanyUrl } from '@/lib/discover-url'
import { runBatchJob, fetchActiveBatchJob, jobHasPending, recoverInterruptedBatchRows } from '@/lib/batch-runner'
import IntakeDropzone from '@/components/intake-dropzone'
import PipelineContactsPanel, { getPipelineContacts, importPipelineContacts } from '@/components/pipeline-contacts-panel'
import { filterDemoted, demoteCompany, getDemotedSet } from '@/lib/discover-state'
import { logDiscoverDemote } from '@/lib/edit-tracker'
import { applyBehavioralRank } from '@/lib/behavioral-rank'
import { upsertWatch } from '@/lib/mandate-watch'

const EXAMPLE_THESIS = 'Canadian pre-seed AI and fintech from Waterloo and Toronto accelerators'

function DiscoverContent() {
  const [thesis, setThesis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState(null)
  const [meta, setMeta] = useState(null)
  const [fundProfile, setFundProfile] = useState(null)
  const [stageFilter, setStageFilter] = useState('all')
  const [geoFilter, setGeoFilter] = useState('all')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState(null)
  const [pipelineVersion, setPipelineVersion] = useState(0)
  const [demoteVersion, setDemoteVersion] = useState(0)
  const [refining, setRefining] = useState(false)
  const abortRef = useRef(null)
  const batchResumedRef = useRef(false)
  const refineAbortRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const applyDiscoverPayload = useCallback((thesisText, data) => {
    const profile = getFundProfile()
    const strategy = profile ? getActiveStrategy(profile) : null
    const trackingId = profile && strategy ? getTrackingId(profile, strategy) : 'guest'
    const ranked = applyBehavioralRank(data.companies || [], {
      trackingId,
      thesis: thesisText.trim(),
    })
    setCompanies(ranked)
    setMeta({ ...data.meta, cached: data.cached })
    if (!data.meta?.partial) {
      saveSourceResults(thesisText.trim(), ranked, { ...data.meta, cached: data.cached }, profile?.id, strategy?.id)
    }
    return ranked
  }, [])

  const runSearch = useCallback(async (thesisText, { forceRegenerate = false } = {}) => {
    const fundContext = resolveApiFundContext()
    if (!fundContext?.fundName || fundContext.isGuest) {
      setError('Choose a fund first — switcher above or Fund settings.')
      return
    }

    refineAbortRef.current?.abort()
    setLoading(true)
    setRefining(false)
    setError('')
    if (!forceRegenerate) {
      setCompanies(null)
      setStageFilter('all')
      setGeoFilter('all')
      setSectorFilter('all')
    }

    let paintedFast = false
    try {
      // Instant community paint (&lt;1s) — then silent full refine in background.
      const fastRes = await fetch('/api/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesis: thesisText.trim(),
          fundContext,
          fastPath: true,
        }),
      })
      if (fastRes.ok) {
        const fastData = await fastRes.json()
        if (fastData.companies?.length) {
          applyDiscoverPayload(thesisText, fastData)
          paintedFast = true
          setLoading(false)
          setRefining(true)
        }
      }

      const ac = new AbortController()
      refineAbortRef.current = ac
      const res = await fetch('/api/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesis: thesisText.trim(),
          fundContext,
          forceRegenerate,
        }),
        signal: ac.signal,
      })
      if (!res.ok) {
        const err = await res.json()
        if (!paintedFast) throw new Error(err.error || 'Search failed')
        setError(err.error || 'Refine failed — showing community results')
        return
      }
      const data = await res.json()
      applyDiscoverPayload(thesisText, data)
    } catch (err) {
      if (err.name === 'AbortError') return
      if (!paintedFast) setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
      setRefining(false)
    }
  }, [applyDiscoverPayload])

  function loadSavedForContext() {
    const profile = getFundProfile()
    const strategy = getActiveStrategy(profile)
    setFundProfile(profile)
    const saved = loadSourceResults()
    const matches = saved
      && saved.fundId === profile?.id
      && saved.strategyId === strategy?.id
    if (matches) {
      setThesis(saved.thesis || '')
      setCompanies(saved.companies || null)
      setMeta(saved.meta || null)
    } else {
      setCompanies(null)
      setMeta(null)
    }
    return { profile, strategy }
  }

  useEffect(() => {
    loadSavedForContext()
    const pending = consumePendingThesis()
    if (pending?.thesis) {
      setThesis(pending.thesis)
      if (pending.autoRun || searchParams.get('run') === '1') runSearch(pending.thesis)
      return
    }
    const onCtx = () => loadSavedForContext()
    window.addEventListener('meridian-context-change', onCtx)
    return () => window.removeEventListener('meridian-context-change', onCtx)
  }, [runSearch, searchParams])

  useEffect(() => {
    fetchActiveBatchJob().then(job => {
      if (!job || batchResumedRef.current) return
      const normalized = recoverInterruptedBatchRows(job)
      if (!jobHasPending(normalized)) return
      batchResumedRef.current = true
      setBatchRunning(true)
      setBatchProgress(normalized.progress)
      abortRef.current = new AbortController()
      runBatchJob({
        resumeJob: normalized,
        signal: abortRef.current.signal,
        onProgress: setBatchProgress,
      }).finally(() => {
        setBatchRunning(false)
        abortRef.current = null
      })
    })
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!thesis.trim()) return
    await runSearch(thesis)
  }

  const stages = useMemo(() => [...new Set(companies?.map(c => c.stage).filter(Boolean) ?? [])].sort(), [companies])
  const geographies = useMemo(() => [...new Set(companies?.map(c => c.geography).filter(Boolean) ?? [])].sort(), [companies])
  const sectors = useMemo(() => [...new Set(companies?.map(c => c.sector).filter(Boolean) ?? [])].sort(), [companies])

  const filtered = useMemo(() => {
    if (!companies) return []
    void demoteVersion
    const base = filterDemoted(companies, thesis)
    return base.filter(c => {
      if (stageFilter !== 'all' && c.stage !== stageFilter) return false
      if (geoFilter !== 'all' && c.geography !== geoFilter) return false
      if (sectorFilter !== 'all' && c.sector !== sectorFilter) return false
      return true
    })
  }, [companies, stageFilter, geoFilter, sectorFilter, thesis, demoteVersion])

  const demotedCount = useMemo(() => {
    if (!companies || !thesis) return 0
    void demoteVersion
    return getDemotedSet(thesis).size
  }, [companies, thesis, demoteVersion])

  const tableEmptyReason = useMemo(() => {
    if (!companies?.length) return 'zero_results'
    if (filtered.length === 0 && demotedCount >= companies.length) return 'all_demoted'
    if (filtered.length === 0) return 'filtered'
    return 'no_matches'
  }, [companies, filtered.length, demotedCount])

  const savedSource = loadSourceResults()

  const pipelineContacts = useMemo(() => {
    void pipelineVersion
    return getPipelineContacts()
  }, [pipelineVersion])

  function briefPipelineContact(contact) {
    const url = contact.url || (contact.domain ? `https://${contact.domain}` : '')
    if (!url) return
    generateMemo({ name: contact.name, url, domain: contact.domain })
  }

  async function handlePipelineIntake(payload) {
    if (payload.kind === 'pipeline' && payload.pipeline?.length) {
      importPipelineContacts(payload.pipeline)
      setPipelineVersion(v => v + 1)
      return
    }
    if (payload.kind === 'thesis') {
      setThesis(payload.thesis)
      await runSearch(payload.thesis)
    }
  }

  function generateMemo(company) {
    const url = resolveDiscoverCompanyUrl(company)
    if (!url) {
      setError(`${company.name} has no website on file — paste their URL on Brief manually.`)
      return
    }

    const existing = findMemoByDomain(url, { fundId: fundProfile?.id })
    if (existing) {
      sessionStorage.setItem('memoData', JSON.stringify(existing.data))
      sessionStorage.setItem('memoSource', 'library')
      sessionStorage.setItem('memoId', existing.id)
      sessionStorage.removeItem('qualityGate')
      router.push('/memo')
      return
    }

    sessionStorage.setItem('meridian_source_context', JSON.stringify(buildSourceContext(savedSource || { thesis, meta }, company)))
    router.push(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
  }

  async function handleBatchBrief(selected) {
    if (!selected.length) return
    if (selected.length > 3 && !window.confirm('Batch briefs are expensive. Continue with more than 3?')) return
    abortRef.current = new AbortController()
    setBatchRunning(true)
    setBatchProgress({ completed: 0, failed: 0, skipped: 0, total: selected.length, current: null, results: [] })
    const sourceContext = savedSource
      ? { thesis: savedSource.thesis, parsed: savedSource.meta?.parsed, companies: selected }
      : { thesis, companies: selected }
    await runBatchJob({
      companies: selected,
      sourceContext,
      researchMode: 'auto',
      signal: abortRef.current.signal,
      onProgress: setBatchProgress,
    })
    setBatchRunning(false)
    abortRef.current = null
  }

  function handleDemote(company) {
    demoteCompany(thesis, company)
    const profile = getFundProfile()
    const strategy = profile ? getActiveStrategy(profile) : null
    const tid = profile && strategy ? getTrackingId(profile, strategy) : 'guest'
    logDiscoverDemote({
      companyName: company.name,
      thesis,
      trackingId: tid,
      fundName: profile?.fundName,
    })
    setDemoteVersion(v => v + 1)
  }

  const subtitle = meta
    ? [
      `${filtered.length} results`,
      refining ? 'refining…' : meta.partial ? 'instant · community' : null,
      meta.startuphubConfigured ? `hub ${meta.startuphubCount}` : null,
      meta.researchPasses?.length ? `${meta.researchPasses.length} web passes` : null,
      meta.canadianMandate ? `CA ${meta.canadianResultCount ?? meta.incubatorResultCount ?? 0}` : null,
      meta.thin ? 'thin' : null,
      meta.cached ? 'cached' : null,
    ].filter(Boolean).join(' · ')
    : fundProfile?.fundName || 'thesis search'

  return (
    <WorkspaceShell
      title="Discover"
      subtitle={subtitle}
      actions={companies && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => runSearch(thesis, { forceRegenerate: true })}
            disabled={loading || !thesis.trim()}
            className="m-btn-ghost m-btn-sm"
          >
            Refresh
          </button>
          <button type="button" onClick={() => { setCompanies(null); setMeta(null) }} className="m-btn-secondary m-btn-sm">
            New search
          </button>
        </div>
      )}
    >
      {!companies && !loading && (
        <WorkspacePage width="narrow">
          {getActiveStrategy(fundProfile)?.thesis && (
            <WorkspaceSection
              title={`Strategy mandate · ${getActiveStrategy(fundProfile)?.name}`}
              description="Active strategy — switch above or edit in Fund settings"
            >
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
                {getActiveStrategy(fundProfile).thesis.slice(0, 280)}
                {getActiveStrategy(fundProfile).thesis.length > 280 ? '…' : ''}
              </p>
            </WorkspaceSection>
          )}
          <WorkspaceSection
            title="Search thesis"
            description="Drop a file, paste a thesis, or we use your fund mandate automatically."
          >
            <IntakeDropzone
              compact
              className="mb-4"
              onIntake={handlePipelineIntake}
              hint="Thesis text, portfolio CSV, or contact export"
            />
            <form onSubmit={handleSearch}>
              <textarea
                id="thesis"
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder={EXAMPLE_THESIS}
                rows={4}
                disabled={loading}
                className="m-textarea"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {getActiveStrategy(fundProfile)?.thesis && (
                    <button
                      type="button"
                      onClick={() => setThesis(getActiveStrategy(fundProfile).thesis)}
                      className="m-btn-ghost m-btn-sm"
                    >
                      Use fund mandate
                    </button>
                  )}
                  {getActiveStrategy(fundProfile)?.thesis && (
                    <button
                      type="button"
                      onClick={() => {
                        const strategy = getActiveStrategy(fundProfile)
                        if (!fundProfile || !strategy?.thesis) return
                        upsertWatch({
                          fundId: fundProfile.id,
                          fundName: fundProfile.fundName,
                          strategyId: strategy.id,
                          strategyName: strategy.name,
                          thesis: thesis.trim() || strategy.thesis,
                        })
                        router.push('/flow')
                      }}
                      className="m-btn-secondary m-btn-sm"
                    >
                      Watch → Deal Flow
                    </button>
                  )}
                </div>
                <button type="submit" disabled={loading || !thesis.trim()} className="m-btn-primary">
                  Run search
                </button>
              </div>
            </form>
          </WorkspaceSection>

          {pipelineContacts.length > 0 && (
            <WorkspaceSection title="Your pipeline" description="Imported contacts and companies — brief without searching" bare>
              <PipelineContactsPanel contacts={pipelineContacts} onBrief={briefPipelineContact} />
            </WorkspaceSection>
          )}

          {error && <p className="m-alert-error mt-4">{error}</p>}
        </WorkspacePage>
      )}

      {loading && !companies && (
        <div className="m-loader">
          <div className="m-loader-bar"><div /></div>
          <p className="text-[13px] font-medium">Surfacing community companies</p>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>incubators → grants → rank</p>
        </div>
      )}

      {companies && (
        <WorkspacePage width="wide">
          {refining && (
            <div className="m-magic-refine mb-4">
              <span className="m-magic-refine-dot" />
              Ranking against web research in the background — table stays live.
            </div>
          )}
          <BatchProgressPanel progress={batchProgress} running={batchRunning} onCancel={() => { abortRef.current?.abort(); setBatchRunning(false) }} />
          <FilterBar
            filters={[
              { label: 'Stage', value: stageFilter, onChange: setStageFilter, options: stages },
              { label: 'Geo', value: geoFilter, onChange: setGeoFilter, options: geographies },
              { label: 'Sector', value: sectorFilter, onChange: setSectorFilter, options: sectors },
            ]}
            trailing={<span className="font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>{filtered.length}/{companies.length}</span>}
          />
          {meta?.thinCanadian && (
            <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-800">
              <span className="font-medium">Thin Canadian web hits.</span>
              {' '}StartupHub skews US/global. Prefer incubator and grant rows with provenance when present — treat registry as low-confidence skim.
            </div>
          )}
          {meta?.thin && !meta?.thinCanadian && (
            <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-800">
              <span className="font-medium">Thin results.</span>
              {' '}Try a broader thesis or hit Refresh. Database seeds: {meta.seedCount ?? 0}
              {meta.startuphubRawCount > meta.startuphubCount ? ` (${meta.startuphubRawCount - meta.startuphubCount} filtered by geography)` : ''}.
            </div>
          )}
          <div className="m-card overflow-hidden m-magic-table">
            <SourceTable
              companies={filtered}
              onGenerateMemo={generateMemo}
              onBatchBrief={handleBatchBrief}
              onDemote={handleDemote}
              batchRunning={batchRunning}
              demotedCount={demotedCount}
              emptyReason={tableEmptyReason}
            />
          </div>
        </WorkspacePage>
      )}
    </WorkspaceShell>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DiscoverContent />
    </Suspense>
  )
}
