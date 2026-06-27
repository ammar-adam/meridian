'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resolveApiFundContext } from '@/lib/fund-profile'
import { buildMemoMeta, writeMemoMetaToSession } from '@/lib/memo-context'
import { getMemoLibrary } from '@/lib/memo-library'
import {
  findExistingBrief,
  runMemoPipeline,
  fetchScrapePreview,
  prefetchResearch,
  resolveResearchText,
  resolveEffectiveResearchMode,
  needsPerplexity,
  urlsMatchForPrefetch,
} from '@/lib/memo-pipeline'
import { buildInstantResearch } from '@/lib/instant-research'
import { buildDraftMemoFromScrape, MEMO_GENERATING_KEY, MEMO_PENDING_BRIEF_KEY } from '@/lib/memo-draft'
import { formatBriefAge } from '@/lib/cost-estimate'
import { RESEARCH_MODES } from '@/lib/research-mode'
import BriefPreview from '@/components/brief-preview'
import IntakeDropzone from '@/components/intake-dropzone'
import BriefStarters from '@/components/brief-starters'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import { learningAppliedMessage } from '@/lib/learning-preview'
import { normalizeUrl, extractDomain } from '@/lib/url-utils'
import { validateBriefUrl } from '@/lib/brief-url'

const STEPS = [
  { id: 'scrape', label: 'Scrape' },
  { id: 'research', label: 'Research' },
  { id: 'generate', label: 'Generate' },
]

const SLOW_THRESHOLD_MS = 60_000

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function stepProgress(stepStatus) {
  const done = STEPS.filter(s => stepStatus[s.id] === 'done').length
  const active = STEPS.some(s => stepStatus[s.id] === 'active')
  const base = (done / STEPS.length) * 100
  return active && done < STEPS.length ? Math.min(base + 8, 95) : base
}

function buildProvisionalMemoId(scraped, url) {
  const domain = scraped?.domain || extractDomain(url)
  const slug = (scraped?.ogTitle || domain || 'memo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
  return `${slug}_${Date.now()}`
}

export default function GenerateWorkspace() {
  const searchParams = useSearchParams()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepStatus, setStepStatus] = useState({})
  const [error, setError] = useState('')
  const [slowWarning, setSlowWarning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [library, setLibrary] = useState([])
  const [pendingAutogen, setPendingAutogen] = useState(false)
  const [existingBrief, setExistingBrief] = useState(null)
  const [learningNote, setLearningNote] = useState('')
  const [researchMode, setResearchMode] = useState('auto')
  const [apiHealth, setApiHealth] = useState(null)
  const [previewScraped, setPreviewScraped] = useState(null)
  const [scrapedCache, setScrapedCache] = useState(null)
  const router = useRouter()
  const abortRef = useRef(null)
  const timerRef = useRef(null)
  const previewAbortRef = useRef(null)
  const prefetchRef = useRef({ url: '', mode: '', research: null })
  const submittingRef = useRef(false)

  useEffect(() => {
    const q = searchParams.get('url')
    if (q) setUrl(q)
    if (q && searchParams.get('autogen') === '1') setPendingAutogen(true)
  }, [searchParams])

  useEffect(() => {
    const fundId = resolveApiFundContext().id || 'guest'
    setExistingBrief(url.trim() ? findExistingBrief(url, fundId) : null)
    setPreviewScraped(null)
    setScrapedCache(null)
    prefetchRef.current = { url: '', mode: '', research: null }
  }, [url])

  useEffect(() => { setLibrary(getMemoLibrary()) }, [])

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setApiHealth).catch(() => {})
  }, [])

  useEffect(() => {
    if (!url.trim() || loading) return undefined
    const t = setTimeout(async () => {
      previewAbortRef.current?.abort()
      previewAbortRef.current = new AbortController()
      const signal = previewAbortRef.current.signal
      try {
        const scraped = await fetchScrapePreview(url, signal)
        if (signal.aborted) return
        setPreviewScraped(scraped)
        setScrapedCache(scraped)
        const eff = resolveEffectiveResearchMode(researchMode, scraped)
        if (eff === 'instant') {
          prefetchRef.current = { url, mode: eff, research: buildInstantResearch(scraped) }
          return
        }
        const research = await prefetchResearch(url, eff, signal)
        if (signal.aborted) return
        prefetchRef.current = { url, mode: eff, research }
      } catch (err) {
        if (err.name !== 'AbortError') prefetchRef.current = { url: '', mode: '', research: null }
      }
    }, 500)
    return () => {
      clearTimeout(t)
      previewAbortRef.current?.abort()
    }
  }, [url, researchMode, loading])

  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      setSlowWarning(false)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000)
      setElapsed(secs)
      if (secs * 1000 >= SLOW_THRESHOLD_MS) setSlowWarning(true)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  const viewMemo = useCallback((id) => {
    const entry = getMemoLibrary().find(e => e.id === id)
    if (!entry) return
    sessionStorage.setItem('memoData', JSON.stringify(entry.data))
    sessionStorage.setItem('memoSource', 'library')
    sessionStorage.setItem('memoId', entry.id)
    sessionStorage.removeItem('qualityGate')
    router.push('/memo')
  }, [router])

  const runPipeline = useCallback(async (forceRegenerate = false, { deep = false, retryResearch = false } = {}) => {
    const validated = validateBriefUrl(url)
    if (!validated.ok) {
      setError(validated.message)
      return
    }
    if (submittingRef.current) return

    const targetUrl = validated.url
    const mode = deep ? 'deep' : researchMode
    const scrapedForCheck = scrapedCache || previewScraped
    const perplexityRequired = needsPerplexity(mode, scrapedForCheck)

    if (apiHealth && !apiHealth.anthropic) {
      setError('API keys not configured — add ANTHROPIC_API_KEY to .env.local')
      return
    }
    if (apiHealth && perplexityRequired && !apiHealth.perplexity) {
      setError('PERPLEXITY_API_KEY required for Quick/Deep research — or use Instant mode')
      return
    }

    const fundContext = resolveApiFundContext()
    const tid = fundContext.trackingId || 'guest'

    abortRef.current = new AbortController()
    submittingRef.current = true
    setLoading(true)
    setError('')
    setSlowWarning(false)
    setElapsed(0)
    setStepStatus({ scrape: 'active', research: 'pending', generate: 'pending' })
    setLearningNote(learningAppliedMessage(tid) || '')

    let sourceContext = null
    try {
      const raw = sessionStorage.getItem('meridian_source_context')
      if (raw) sourceContext = JSON.parse(raw)
    } catch { /* ignore */ }

    let scraped = scrapedCache
    try {
      if (!scraped || retryResearch) {
        scraped = await fetchScrapePreview(targetUrl, abortRef.current.signal)
        setPreviewScraped(scraped)
        setScrapedCache(scraped)
      }
      setStepStatus({ scrape: 'done', research: 'active', generate: 'pending' })

      writeMemoMetaToSession(buildMemoMeta({
        url: targetUrl,
        searchThesis: sourceContext?.thesis,
      }))

      const effectiveMode = resolveEffectiveResearchMode(mode, scraped)
      const prefetched = urlsMatchForPrefetch(targetUrl, prefetchRef.current.url)
        && prefetchRef.current.mode === effectiveMode
        ? prefetchRef.current.research
        : null

      if (effectiveMode !== 'deep') {
        const research = await resolveResearchText(targetUrl, {
          researchMode: mode,
          scraped,
          prefetchedResearch: prefetched,
          signal: abortRef.current.signal,
          forceRegenerate,
        })
        setStepStatus({ scrape: 'done', research: 'done', generate: 'active' })

        const draft = buildDraftMemoFromScrape(scraped, fundContext)
        const memoId = buildProvisionalMemoId(scraped, targetUrl)
        sessionStorage.setItem('memoData', JSON.stringify(draft))
        sessionStorage.setItem('memoId', memoId)
        sessionStorage.removeItem('qualityGate')
        sessionStorage.setItem('memoSource', 'generating')
        sessionStorage.setItem(MEMO_PENDING_BRIEF_KEY, JSON.stringify({
          url: targetUrl,
          research,
          scraped,
          fundContext,
          sourceContext,
          forceRegenerate,
          researchMode: mode,
          memoId,
        }))
        sessionStorage.setItem(MEMO_GENERATING_KEY, '1')
        router.push('/memo?generating=1')
        setLoading(false)
        setStepStatus({})
        return
      }

      const { memoData, qualityGate, memoId } = await runMemoPipeline({
        url: targetUrl,
        fundContext,
        sourceContext,
        signal: abortRef.current.signal,
        forceRegenerate,
        researchMode: 'deep',
        scraped,
        retryResearch,
        prefetchedResearch: prefetched,
        onStep: (id, status) => setStepStatus(s => ({ ...s, [id]: status })),
      })
      sessionStorage.setItem('memoData', JSON.stringify(memoData))
      sessionStorage.setItem('qualityGate', JSON.stringify(qualityGate))
      sessionStorage.setItem('memoSource', 'pipeline')
      sessionStorage.setItem('memoId', memoId)
      router.push('/memo')
    } catch (err) {
      if (err.canRetryResearch && err.scraped) {
        setScrapedCache(err.scraped)
        setPreviewScraped(err.scraped)
        setError(`${err.message} — you can retry research without re-scraping.`)
      } else if (err.failedStep) {
        setError(`${err.message} (failed at ${err.failedStep})`)
      } else if (err.message === 'fetch failed' || err.message?.includes('Failed to fetch')) {
        setError('Could not reach that website — check the URL and try again')
      } else {
        setError(err.name === 'AbortError' ? 'Cancelled.' : err.message || 'Failed')
      }
      setLoading(false)
      if (!err.canRetryResearch) setStepStatus({})
    } finally {
      submittingRef.current = false
      abortRef.current = null
    }
  }, [router, url, apiHealth, researchMode, scrapedCache, previewScraped])

  useEffect(() => {
    if (!pendingAutogen || !url.trim() || loading) return
    const fundId = resolveApiFundContext().id || 'guest'
    const existing = findExistingBrief(url, fundId)
    if (existing) {
      setPendingAutogen(false)
      viewMemo(existing.id)
      return
    }
    setPendingAutogen(false)
    const t = setTimeout(() => runPipeline(false), 400)
    return () => clearTimeout(t)
  }, [pendingAutogen, url, loading, runPipeline, viewMemo])

  async function handleGenerate(e) {
    e.preventDefault()
    await runPipeline(false)
  }

  const progress = stepProgress(stepStatus)

  return (
    <>
      {loading && (
        <div className="m-overlay">
          <div className="m-modal">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] font-medium">Generating brief</span>
              <span className="font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>{formatElapsed(elapsed)}</span>
            </div>
            <div className="mb-4 h-0.5 overflow-hidden rounded-full" style={{ background: 'var(--m-border)' }}>
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'var(--m-text)' }} />
            </div>
            <ul className="mb-4 space-y-2">
              {STEPS.map(step => (
                <li key={step.id} className="flex items-center gap-2 font-mono text-[11px]">
                  <span style={{ color: stepStatus[step.id] === 'done' ? '#059669' : stepStatus[step.id] === 'active' ? 'var(--m-text)' : 'var(--m-muted-2)' }}>
                    {stepStatus[step.id] === 'done' ? '✓' : stepStatus[step.id] === 'active' ? '…' : '·'}
                  </span>
                  <span>{step.label}</span>
                </li>
              ))}
            </ul>
            {learningNote && stepStatus.generate === 'active' && (
              <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                {learningNote}
              </p>
            )}
            {slowWarning && (
              <p className="m-alert-warn mb-3">
                {researchMode === 'deep'
                  ? 'Deep research can take 3–5 minutes. Switch to Auto/Quick or cancel.'
                  : 'Still working — research may be running ahead of generate.'}
              </p>
            )}
            <button onClick={() => { abortRef.current?.abort(); setLoading(false); setStepStatus({}) }} className="m-btn-secondary w-full">
              Cancel
            </button>
          </div>
        </div>
      )}

      <WorkspacePage width="narrow">
        {apiHealth && !apiHealth.anthropicKeyPresent && (
          <p className="m-alert-error mb-4">
            Missing ANTHROPIC_API_KEY — brief generation will fail. Configure `.env.local` first.
          </p>
        )}
        {apiHealth?.anthropicKeyPresent && apiHealth.anthropicPing && !apiHealth.anthropicPing.ok && (
          <p className="m-alert-error mb-4">
            AI generation unavailable — {apiHealth.anthropicPing.error || 'model or API issue'}. Check server logs.
          </p>
        )}

        <WorkspaceSection
          title="Company URL"
          description="Drop a URL, contact export, or company list — we handle the rest."
        >
          <IntakeDropzone
            compact
            className="mb-4"
            onIntake={(payload) => {
              if (payload.kind === 'company_urls') {
                if (payload.companyUrls.length > 1) {
                  sessionStorage.setItem('meridian_batch_urls', JSON.stringify(payload.companyUrls))
                  router.push('/lists')
                  return
                }
                setUrl(payload.companyUrls[0])
                return
              }
              if (payload.kind === 'pipeline' && payload.pipeline?.length > 1) {
                const urls = payload.pipeline.map(c => c.url || (c.domain ? `https://${c.domain}` : '')).filter(Boolean)
                sessionStorage.setItem('meridian_batch_urls', JSON.stringify(urls))
                router.push('/lists')
                return
              }
              if (payload.kind === 'company_url') {
                setUrl(payload.companyUrls[0])
                return
              }
              if (payload.kind === 'pipeline' && payload.pipeline?.[0]) {
                const c = payload.pipeline[0]
                setUrl(c.url || (c.domain ? `https://${c.domain}` : ''))
              }
            }}
            hint="Company URL, .vcf contacts, or pasted list"
          />
          <form id="generate-form" onSubmit={handleGenerate}>
            <input
              id="company-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="company.com"
              disabled={loading}
              className={error ? 'm-input ring-1 ring-red-300' : 'm-input'}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.values(RESEARCH_MODES).map(m => (
                <button
                  key={m.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setResearchMode(m.id)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium ring-1 transition ${
                    researchMode === m.id
                      ? 'bg-zinc-900 text-white ring-zinc-900'
                      : 'bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {m.label} · {m.hint}
                </button>
              ))}
            </div>
            {previewScraped && (
              <BriefPreview
                scraped={previewScraped}
                loading={loading}
                researchMode={researchMode}
                className="mt-4 mb-4"
              />
            )}
            <button type="submit" disabled={loading || !url.trim()} className="m-btn-primary mt-4 w-full">
              {loading ? 'Running…' : 'Generate brief'}
            </button>
          </form>

          {existingBrief && !loading && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
              <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>
                Brief saved {formatBriefAge(existingBrief.savedAt)} — open existing or regenerate.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => viewMemo(existingBrief.id)} className="m-btn-primary m-btn-sm">
                  Open
                </button>
                <button type="button" onClick={() => runPipeline(true)} className="m-btn-secondary m-btn-sm">
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </WorkspaceSection>

        <BriefStarters onPickUrl={setUrl} compact />

        {error && !loading && (
          <div className="mt-4 space-y-2">
            <p className="m-alert-error">{error}</p>
            {error.includes('retry research') && (
              <button
                type="button"
                className="m-btn-secondary w-full"
                onClick={() => { setError(''); runPipeline(false, { retryResearch: true }) }}
              >
                Retry research only
              </button>
            )}
            {error.includes('timed out') && researchMode !== 'deep' && (
              <button
                type="button"
                className="m-btn-secondary w-full"
                onClick={() => { setError(''); runPipeline(false, { deep: true }) }}
              >
                Retry with Deep research (~5 min)
              </button>
            )}
          </div>
        )}

        {library.length > 0 && (
          <WorkspaceSection
            title="Recent briefs"
            description="Continue reviewing or open the full library"
            actions={
              <div className="flex gap-2">
                <Link href="/lists" className="m-btn-ghost m-btn-sm">Batch list</Link>
                <Link href="/library" className="m-btn-ghost m-btn-sm">View all</Link>
              </div>
            }
            bare
          >
            <div className="m-table-wrap">
              <table className="m-table !min-w-0">
                <tbody>
                  {library.slice(0, 5).map(entry => (
                    <tr key={entry.id} onClick={() => viewMemo(entry.id)} className="cursor-pointer">
                      <td className="font-medium">{entry.companyName}</td>
                      <td className="text-[13px]" style={{ color: 'var(--m-muted)' }}>{entry.round}</td>
                      <td>
                        {entry.outcome ? (
                          <span className={entry.outcome === 'pursue' ? 'm-outcome-pursue' : 'm-outcome-pass'}>{entry.outcome}</span>
                        ) : (
                          <span className="m-outcome-pending">Review</span>
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
    </>
  )
}
