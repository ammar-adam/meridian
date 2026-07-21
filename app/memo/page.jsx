'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { populateTemplate } from '@/lib/populate-template'
import { saveMemo, updateMemoMeta } from '@/lib/memo-library'
import { logEdit, logOutcome, getEditsForMemo, removeOutcome, getOutcomeForMemo } from '@/lib/edit-tracker'
import { getFundProfile, getTrackingId, getActiveStrategy, hasFundProfile } from '@/lib/fund-profile'
import { memoTemplatePath, resolveMemoTemplateId } from '@/lib/memo-template'
import OutreachDrawer from '@/components/outreach-drawer'
import { readMemoMetaFromSession } from '@/lib/memo-context'
import { getMemoById } from '@/lib/memo-library'
import { copyMemoShare, createShareLink, downloadMemoPdf } from '@/lib/memo-export'
import { openDemoMemo } from '@/lib/demo-memo'
import { incrementBriefCount } from '@/lib/onboarding'
import { getTeamContext } from '@/lib/team-workspace'
import { DEMO_MEMO_ID } from '@/lib/demo-memo'
import { completeBriefGenerate } from '@/lib/memo-pipeline'
import {
  MEMO_GENERATING_KEY,
  MEMO_PENDING_BRIEF_KEY,
  MEMO_GENERATE_INFLIGHT_KEY,
} from '@/lib/memo-draft'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import PageLoader from '@/components/page-loader'

const PIPELINE_SAVED_KEY = 'meridian_pipeline_just_saved'

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

function captureMemoFromDom(container) {
  if (!container) return {}
  const captured = {}
  container.querySelectorAll('[data-field]').forEach((el) => {
    const field = el.getAttribute('data-field')
    captured[field] = el.innerText.trim()
  })
  return captured
}

export default function MemoPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MemoPageContent />
    </Suspense>
  )
}

function MemoPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memoRef = useRef(null)
  const memoDataRef = useRef(null)
  const editCleanupRef = useRef(null)
  const lastHtmlRef = useRef('')
  const [html, setHtml] = useState('')
  const [memoData, setMemoData] = useState(null)
  const [memoId, setMemoId] = useState('')
  const [trackingId, setTrackingId] = useState('demo')
  const [fundName, setFundName] = useState('')
  const [loading, setLoading] = useState(true)
  const [qualityGate, setQualityGate] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [qualityWarningsExpanded, setQualityWarningsExpanded] = useState(false)
  const [errorBannerDismissed, setErrorBannerDismissed] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [editCount, setEditCount] = useState(0)
  const [empty, setEmpty] = useState(false)
  const [showOutcomeNudge, setShowOutcomeNudge] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [serverPdf, setServerPdf] = useState(false)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareError, setShareError] = useState('')
  const [regenerateUrl, setRegenerateUrl] = useState('')
  const [finishingBrief, setFinishingBrief] = useState(false)
  const [finishError, setFinishError] = useState('')
  const [outcomeBlocked, setOutcomeBlocked] = useState('')
  const [outreachOpen, setOutreachOpen] = useState(false)
  const [showOutreachPrompt, setShowOutreachPrompt] = useState(false)
  const [companyDomain, setCompanyDomain] = useState('')
  const outcomeNudgeSkippedRef = useRef(false)
  const pendingGenerateRef = useRef(false)
  const pendingNavRef = useRef(null)

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(h => {
      setServerPdf(!!h.features?.serverPdf)
      setShareEnabled(!!h.features?.shareLinks)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    memoDataRef.current = memoData
  }, [memoData])

  useEffect(() => {
    const profile = getFundProfile()
    const sessionMeta = readMemoMetaFromSession()
    setCompanyDomain(sessionMeta?.companyDomain || '')
    const queryId = searchParams.get('id')

    let data = null
    let source = null
    let qg = null
    const sessionSource = typeof window !== 'undefined' ? sessionStorage.getItem('memoSource') : null
    const isGeneratingSession = sessionSource === 'generating'
    let id = isGeneratingSession
      ? sessionStorage.getItem('memoId')
      : (queryId || sessionStorage.getItem('memoId'))

    if (id === DEMO_MEMO_ID && isGeneratingSession) {
      id = null
    }

    if (queryId && !isGeneratingSession) {
      const fromLibrary = getMemoById(queryId)
      if (fromLibrary) {
        data = fromLibrary.data
        source = 'library'
        id = fromLibrary.id
        sessionStorage.setItem('memoData', JSON.stringify(data))
        sessionStorage.setItem('memoSource', 'library')
        sessionStorage.setItem('memoId', id)
        if (fromLibrary.qualityFlags) {
          qg = {
            passed: fromLibrary.qualityPassed ?? false,
            flags: fromLibrary.qualityFlags,
          }
          sessionStorage.setItem('qualityGate', JSON.stringify(qg))
          setQualityGate(qg)
        }
      }
    }

    if (!data) {
      try {
        const stored = sessionStorage.getItem('memoData')
        if (stored) {
          data = JSON.parse(stored)
          source = sessionStorage.getItem('memoSource') || 'pipeline'
        }
        const qgStored = sessionStorage.getItem('qualityGate')
        if (qgStored) {
          qg = JSON.parse(qgStored)
          setQualityGate(qg)
        }
      } catch {
        // ignore parse errors
      }
    }

    if (!data) {
      setEmpty(true)
      setLoading(false)
      return
    }

    if (!id) {
      const slug = (data.COMPANY_NAME ?? 'memo').toLowerCase().replace(/\s+/g, '_')
      id = `${slug}_${Date.now()}`
      sessionStorage.setItem('memoId', id)
    }

    const existing = getMemoById(id)
    const meta = sessionMeta || (existing ? {
      fundId: existing.fundId,
      fundName: existing.fundName,
      strategyId: existing.strategyId,
      strategyName: existing.strategyName,
      trackingId: existing.trackingId,
      searchThesis: existing.sourceThesis,
      companyDomain: existing.companyDomain,
    } : null)

    if (profile) {
      const strategy = getActiveStrategy(profile)
      const tid = meta?.trackingId || getTrackingId(profile, strategy)
      setTrackingId(tid)
      const label = meta?.strategyName && meta.strategyName !== 'Primary'
        ? `${profile.fundName} · ${meta.strategyName}`
        : profile.fundName
      setFundName(meta?.fundName || label)
    } else if (meta?.trackingId) {
      setTrackingId(meta.trackingId)
      setFundName(meta.fundName || '')
    }

    const briefUrl = sessionMeta?.companyUrl
      || (sessionMeta?.companyDomain ? `https://${sessionMeta.companyDomain}` : null)
      || (existing?.companyDomain ? `https://${existing.companyDomain}` : null)
    setRegenerateUrl(briefUrl || '')

    if (source === 'pipeline') {
      const justSaved = sessionStorage.getItem(PIPELINE_SAVED_KEY) === id
      if (justSaved) {
        sessionStorage.removeItem(PIPELINE_SAVED_KEY)
      } else {
        const saveMeta = meta || (profile ? {
          ...sessionMeta,
          trackingId: getTrackingId(profile, getActiveStrategy(profile)),
          fundId: profile.id,
          fundName: profile.fundName,
        } : {})
        saveMemo(data, id, {
          ...saveMeta,
          qualityPassed: qg?.passed ?? null,
          qualityWarnCount: qg?.flags?.filter(f => f.severity === 'warn').length ?? 0,
          qualityErrorCount: qg?.flags?.filter(f => f.severity === 'error').length ?? 0,
          qualityFlags: qg?.flags ?? null,
        })
        incrementBriefCount()
      }
    }

    if (source === 'generating') {
      setFinishingBrief(true)
      if (!sessionStorage.getItem(MEMO_PENDING_BRIEF_KEY) && sessionStorage.getItem(MEMO_GENERATING_KEY)) {
        setFinishError('Brief generation was interrupted — go back and regenerate.')
        setFinishingBrief(false)
      }
    }

    setIsDemo(source === 'demo')

    setMemoId(id)
    setMemoData(data)
    setEditCount(getEditsForMemo(id).filter(e => e.fieldName !== '_outcome').length)
    setOutcome(getOutcomeForMemo(id))

    fetch(memoTemplatePath(resolveMemoTemplateId(profile)))
      .then((res) => res.text())
      .then((template) => {
        setHtml(populateTemplate(template, data))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('generating') !== '1') return undefined
    if (pendingGenerateRef.current) return undefined

    const raw = sessionStorage.getItem(MEMO_PENDING_BRIEF_KEY)
    if (!raw) {
      if (sessionStorage.getItem(MEMO_GENERATING_KEY)) {
        setFinishError('Brief generation was interrupted — go back and regenerate.')
        setFinishingBrief(false)
      }
      return undefined
    }

    pendingGenerateRef.current = true
    sessionStorage.setItem(MEMO_GENERATE_INFLIGHT_KEY, '1')
    let pending
    try {
      pending = JSON.parse(raw)
    } catch {
      pendingGenerateRef.current = false
      sessionStorage.removeItem(MEMO_GENERATE_INFLIGHT_KEY)
      return undefined
    }

    const ac = new AbortController()
    setFinishingBrief(true)
    setFinishError('')

    const finishSuccess = ({ memoData: nextData, qualityGate: nextQg, memoId: nextId }) => {
      sessionStorage.removeItem(MEMO_PENDING_BRIEF_KEY)
      sessionStorage.removeItem(MEMO_GENERATE_INFLIGHT_KEY)
      sessionStorage.setItem('memoData', JSON.stringify(nextData))
      sessionStorage.setItem('qualityGate', JSON.stringify(nextQg))
      sessionStorage.setItem('memoId', nextId)
      sessionStorage.setItem('memoSource', 'pipeline')
      sessionStorage.removeItem(MEMO_GENERATING_KEY)
      sessionStorage.setItem(PIPELINE_SAVED_KEY, nextId)

      setMemoId(nextId)
      setMemoData(nextData)
      setQualityGate(nextQg)
      setFinishingBrief(false)
      pendingGenerateRef.current = false

      const profile = getFundProfile()
      const sessionMeta = readMemoMetaFromSession()
      const saveMeta = sessionMeta || (profile ? {
        trackingId: getTrackingId(profile, getActiveStrategy(profile)),
        fundId: profile.id,
        fundName: profile.fundName,
      } : {})
      saveMemo(nextData, nextId, {
        ...saveMeta,
        qualityPassed: nextQg?.passed ?? null,
        qualityWarnCount: nextQg?.flags?.filter(f => f.severity === 'warn').length ?? 0,
        qualityErrorCount: nextQg?.flags?.filter(f => f.severity === 'error').length ?? 0,
        qualityFlags: nextQg?.flags ?? null,
      })
      incrementBriefCount()

      return fetch(memoTemplatePath(resolveMemoTemplateId(getFundProfile())))
        .then(res => res.text())
        .then(template => {
          setHtml(populateTemplate(template, nextData))
          router.replace('/memo')
        })
    }

    completeBriefGenerate({ ...pending, signal: ac.signal })
      .then(finishSuccess)
      .catch((err) => {
        if (err.name === 'AbortError') {
          pendingGenerateRef.current = false
          sessionStorage.removeItem(MEMO_GENERATE_INFLIGHT_KEY)
          return
        }
        sessionStorage.removeItem(MEMO_GENERATE_INFLIGHT_KEY)
        setFinishError(err.message || 'Failed to finish brief')
        setFinishingBrief(false)
        pendingGenerateRef.current = false
      })

    return () => {
      ac.abort()
      pendingGenerateRef.current = false
      sessionStorage.removeItem(MEMO_GENERATE_INFLIGHT_KEY)
    }
  }, [searchParams, router])

  const retryGenerate = useCallback(() => {
    const raw = sessionStorage.getItem(MEMO_PENDING_BRIEF_KEY)
    if (!raw) {
      setFinishError('Nothing to retry — start a new brief.')
      return
    }

    let pending
    try {
      pending = JSON.parse(raw)
    } catch {
      setFinishError('Could not read pending brief — start over from Brief.')
      return
    }

    pendingGenerateRef.current = true
    sessionStorage.setItem(MEMO_GENERATE_INFLIGHT_KEY, '1')
    setFinishingBrief(true)
    setFinishError('')

    completeBriefGenerate({ ...pending })
      .then(({ memoData: nextData, qualityGate: nextQg, memoId: nextId }) => {
        sessionStorage.removeItem(MEMO_PENDING_BRIEF_KEY)
        sessionStorage.removeItem(MEMO_GENERATE_INFLIGHT_KEY)
        sessionStorage.setItem('memoData', JSON.stringify(nextData))
        sessionStorage.setItem('qualityGate', JSON.stringify(nextQg))
        sessionStorage.setItem('memoId', nextId)
        sessionStorage.setItem('memoSource', 'pipeline')
        sessionStorage.removeItem(MEMO_GENERATING_KEY)
        sessionStorage.setItem(PIPELINE_SAVED_KEY, nextId)
        setMemoId(nextId)
        setMemoData(nextData)
        setQualityGate(nextQg)
        setFinishingBrief(false)
        pendingGenerateRef.current = false
        const profile = getFundProfile()
        const sessionMeta = readMemoMetaFromSession()
        const saveMeta = sessionMeta || (profile ? {
          trackingId: getTrackingId(profile, getActiveStrategy(profile)),
          fundId: profile.id,
          fundName: profile.fundName,
        } : {})
        saveMemo(nextData, nextId, {
          ...saveMeta,
          qualityPassed: nextQg?.passed ?? null,
          qualityWarnCount: nextQg?.flags?.filter(f => f.severity === 'warn').length ?? 0,
        })
        incrementBriefCount()
        return fetch(memoTemplatePath(resolveMemoTemplateId(getFundProfile())))
          .then(res => res.text())
          .then(template => {
            setHtml(populateTemplate(template, nextData))
            router.replace('/memo')
          })
      })
      .catch((err) => {
        sessionStorage.removeItem(MEMO_GENERATE_INFLIGHT_KEY)
        setFinishError(err.message || 'Failed to finish brief')
        setFinishingBrief(false)
        pendingGenerateRef.current = false
      })
  }, [router])

  const persistMemoData = useCallback((updated) => {
    memoDataRef.current = updated
    setMemoData(updated)
    sessionStorage.setItem('memoData', JSON.stringify(updated))
    if (memoId) saveMemo(updated, memoId)
  }, [memoId])

  const onFieldEdit = useCallback((fieldName, originalValue, newValue) => {
    const current = memoDataRef.current
    if (!current || !memoId) return

    logEdit({
      memoId,
      companyName: current.COMPANY_NAME,
      fundName: current.FUND_NAME,
      trackingId,
      fieldName,
      originalValue,
      newValue,
    })

    const updated = { ...current, [fieldName]: newValue }
    persistMemoData(updated)
    const newEditCount = editCount + 1
    setEditCount(newEditCount)
    updateMemoMeta(memoId, { editCount: newEditCount })
  }, [memoId, persistMemoData, trackingId, editCount])

  const onFieldEditRef = useRef(onFieldEdit)
  onFieldEditRef.current = onFieldEdit

  useLayoutEffect(() => {
    if (!html || !memoData) return undefined

    const attachEditableFields = () => {
      if (!memoRef.current) return () => {}

      const cleanups = []
      const editableFields = memoRef.current.querySelectorAll('[data-field]')

      editableFields.forEach((el) => {
        el.setAttribute('contenteditable', 'true')
        el.setAttribute('spellcheck', 'false')
        el.style.outline = 'none'
        el.style.cursor = 'text'

        const onMouseEnter = () => {
          el.style.background = 'rgba(139, 26, 26, 0.04)'
          el.style.borderRadius = '2px'
        }
        const onMouseLeave = () => {
          if (document.activeElement !== el) {
            el.style.background = el.dataset.edited === 'true'
              ? 'rgba(139, 26, 26, 0.03)'
              : ''
          }
        }
        const onFocus = () => {
          el.style.background = 'rgba(139, 26, 26, 0.06)'
        }
        const onBlur = () => {
          const fieldName = el.getAttribute('data-field')
          const currentValue = memoDataRef.current?.[fieldName] ?? ''
          const newValue = el.innerText.trim()

          el.style.background = el.dataset.edited === 'true'
            ? 'rgba(139, 26, 26, 0.03)'
            : ''

          if (newValue !== stripHtml(currentValue)) {
            el.dataset.edited = 'true'
            el.style.boxShadow = 'inset 2px 0 0 rgba(139, 26, 26, 0.35)'
            onFieldEditRef.current(fieldName, currentValue, newValue)
          }
        }

        el.addEventListener('mouseenter', onMouseEnter)
        el.addEventListener('mouseleave', onMouseLeave)
        el.addEventListener('focus', onFocus)
        el.addEventListener('blur', onBlur)

        cleanups.push(() => {
          el.removeEventListener('mouseenter', onMouseEnter)
          el.removeEventListener('mouseleave', onMouseLeave)
          el.removeEventListener('focus', onFocus)
          el.removeEventListener('blur', onBlur)
        })
      })

      return () => cleanups.forEach(fn => fn())
    }

    if (memoRef.current && lastHtmlRef.current !== html) {
      memoRef.current.innerHTML = html
      lastHtmlRef.current = html
    }

    editCleanupRef.current?.()
    editCleanupRef.current = attachEditableFields()

    return () => {
      editCleanupRef.current?.()
      editCleanupRef.current = null
    }
  }, [html, memoData])

  useEffect(() => {
    if (!outcome) {
      const onBeforeUnload = (e) => {
        e.preventDefault()
        e.returnValue = ''
      }
      window.addEventListener('beforeunload', onBeforeUnload)
      return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [outcome])

  function handleOutcome(selected) {
    if (finishingBrief || finishError) {
      setOutcomeBlocked('Finish generating first')
      setTimeout(() => setOutcomeBlocked(''), 3000)
      return
    }

    const captured = captureMemoFromDom(memoRef.current)
    const current = memoDataRef.current
    if (current && Object.keys(captured).length) {
      persistMemoData({ ...current, ...captured })
    }

    const edits = memoId ? getEditsForMemo(memoId).filter(e => e.fieldName !== '_outcome').length : editCount
    const libraryEntry = memoId ? getMemoById(memoId) : null

    setOutcome(selected)
    if (selected === 'pursue') {
      setShowOutreachPrompt(true)
    }
    if (!current || !memoId) return

    logOutcome({
      memoId,
      companyName: current.COMPANY_NAME,
      fundName: current.FUND_NAME,
      trackingId,
      outcome: selected,
      editCount: edits,
      sector: libraryEntry?.sector || null,
      stage: libraryEntry?.stage || current.ROUND || null,
    })
    updateMemoMeta(memoId, { outcome: selected, editCount: edits })
    setShowOutcomeNudge(false)
    if (pendingNavRef.current) {
      const href = pendingNavRef.current
      pendingNavRef.current = null
      window.location.href = href
    }
  }

  function tryNavigate(href) {
    if (!outcome && !outcomeNudgeSkippedRef.current) {
      pendingNavRef.current = href
      setShowOutcomeNudge(true)
      return
    }
    window.location.href = href
  }

  function handleUndoOutcome() {
    if (memoId) {
      removeOutcome(memoId)
      updateMemoMeta(memoId, { outcome: null })
    }
    setOutcome(null)
  }

  if (loading) {
    return (
      <div className="m-loader flex min-h-screen items-center justify-center">
        <span className="text-[13px]" style={{ color: 'var(--m-muted)' }}>Loading…</span>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: 'var(--m-bg)' }}>
        <div className="m-empty max-w-md text-center">
          <p className="m-kicker mb-2">No brief loaded</p>
          <p className="text-[14px]" style={{ color: 'var(--m-muted)' }}>
            Paste a company URL on Brief — or open the NationGraph demo to see the quality bar instantly.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/brief" className="m-btn-primary">Generate a brief</Link>
            <button type="button" onClick={() => openDemoMemo(router)} className="m-btn-secondary">
              Open demo brief
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function handleCopyShare() {
    const captured = captureMemoFromDom(memoRef.current)
    const merged = { ...memoDataRef.current, ...captured }
    await copyMemoShare(merged, { outcome, editCount })
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  async function handleCreateShareLink() {
    if (!shareEnabled) {
      window.alert('Share links need DATABASE_URL configured on the server. Use Copy text for now.')
      return
    }
    setShareError('')
    try {
      const captured = captureMemoFromDom(memoRef.current)
      const merged = { ...memoDataRef.current, ...captured }
      const team = getTeamContext()
      const { url, shareId } = await createShareLink(merged, {
        outcome,
        editCount,
        fundName: merged.FUND_NAME,
        teamId: team?.teamId,
        createdBy: team?.memberName,
        allowOutcome: true,
        memoId,
        memoTemplateId: resolveMemoTemplateId(getFundProfile()),
      })
      if (memoId && shareId) {
        updateMemoMeta(memoId, { lastShareId: shareId })
      }
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      setShareError(err.message || 'Could not create share link')
    }
  }

  async function handleDownloadPdf() {
    const captured = captureMemoFromDom(memoRef.current)
    const merged = { ...memoDataRef.current, ...captured }
    if (!serverPdf) {
      window.print()
      return
    }
    setPdfLoading(true)
    try {
      await downloadMemoPdf(merged, { templateId: resolveMemoTemplateId(getFundProfile()) })
    } catch {
      window.print()
    } finally {
      setPdfLoading(false)
    }
  }

  const warnings = qualityGate?.flags?.filter(f => f.severity === 'warn') ?? []
  const confidenceWarnings = warnings.filter(f => f.confidence && f.field !== 'CONFIDENCE_SUMMARY')
  const otherWarnings = warnings.filter(f => !f.confidence || f.field === 'CONFIDENCE_SUMMARY')
  const sortedWarnings = [...confidenceWarnings, ...otherWarnings]
  const errors = qualityGate?.flags?.filter(f => f.severity === 'error') ?? []
  const showErrorBanner = errors.length > 0 && !errorBannerDismissed && !finishingBrief && !finishError
  const showWarnBanner = warnings.length > 0 && !bannerDismissed && !showErrorBanner && !finishingBrief && !finishError
  const warnCollapsed = sortedWarnings.length > 3 && !qualityWarningsExpanded
  const hasConfidenceIssues = confidenceWarnings.length > 0 || (qualityGate?.confidenceSummary?.length > 0)
  const isGuestFund = (memoData?.FUND_NAME === 'Your Fund' || fundName === 'Your Fund') && !hasFundProfile()
  const topOffset = (finishingBrief || finishError || showErrorBanner || showWarnBanner) ? '5.5rem' : '3rem'

  return (
    <div>
      <div className="m-toolbar-bar no-print fixed inset-x-0 top-0 z-40">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => tryNavigate('/brief')} className="text-[12px] transition hover:opacity-80" style={{ color: 'var(--m-muted)' }}>
            ← Brief
          </button>
          {regenerateUrl && !isDemo && (
            <Link
              href={`/brief?url=${encodeURIComponent(regenerateUrl)}`}
              className="text-[12px] font-medium transition hover:opacity-80"
              style={{ color: 'var(--m-accent)' }}
            >
              Regenerate
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-semibold" style={{ borderColor: 'var(--m-border)' }}>M</span>
          {fundName || 'Meridian'}
        </div>
        <div className="w-10" />
      </div>

      {finishingBrief && (
        <div className="no-print fixed inset-x-0 top-12 z-50 border-b border-sky-200 bg-sky-50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <p className="text-xs font-medium text-sky-900">
              Finishing brief — draft below updates when Claude completes (~20–40s)
            </p>
            <span className="font-mono text-[10px] text-sky-700">Generating…</span>
          </div>
        </div>
      )}

      {finishError && (
        <div className="no-print fixed inset-x-0 top-12 z-50 border-b border-red-200 bg-red-50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-red-900">{finishError}</p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={retryGenerate} className="text-xs font-medium text-red-800 underline">
                Retry generate
              </button>
              <Link href="/brief" className="text-xs font-medium text-red-700 underline">Back to Brief</Link>
            </div>
          </div>
        </div>
      )}

      {showErrorBanner && (
        <div className="no-print fixed inset-x-0 top-12 z-50 border-b border-red-200 bg-red-50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-red-900">Verify before forwarding — quality issues detected</p>
              <ul className="mt-1 space-y-0.5">
                {errors.map((flag, i) => (
                  <li key={i} className="text-xs text-red-800">{flag.message}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setErrorBannerDismissed(true)} className="shrink-0 text-xs font-medium text-red-700 hover:text-red-900">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showWarnBanner && (
        <div className="no-print fixed inset-x-0 top-12 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-amber-800">
                {warnCollapsed
                  ? `Review quality flags (${warnings.length})`
                  : hasConfidenceIssues
                    ? 'Some sections need manual verification before forwarding'
                    : 'Verify before sharing'}
              </p>
              {!warnCollapsed && (
                <ul className="mt-1 space-y-0.5">
                  {sortedWarnings.map((flag, i) => (
                    <li key={i} className="text-xs text-amber-700">{flag.message}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {warnCollapsed && (
                <button
                  type="button"
                  onClick={() => setQualityWarningsExpanded(true)}
                  className="text-xs font-medium text-amber-800 hover:text-amber-900"
                >
                  Show
                </button>
              )}
              <button onClick={() => setBannerDismissed(true)} className="shrink-0 text-xs text-amber-600 hover:text-amber-800">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {isGuestFund && (
        <div className="no-print fixed right-4 top-14 z-50 max-w-[200px] rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] text-violet-900">
          Generic fund context — <Link href="/fund/setup" className="font-medium underline">personalize</Link> before GP forward
        </div>
      )}

      {isDemo && (
        <div className="no-print fixed left-4 top-14 z-50 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-800">
          Demo brief · NationGraph
        </div>
      )}

      {editCount > 0 && (
        <div className="m-badge no-print fixed left-4 top-16 z-50" style={{ marginTop: isDemo ? '2rem' : 0 }}>
          {editCount} edit{editCount !== 1 ? 's' : ''} saved
        </div>
      )}

      <div
        ref={memoRef}
        style={{ width: '210mm', margin: '0 auto', paddingTop: topOffset }}
      />

      <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 px-4 py-4 backdrop-blur-sm" style={{ borderColor: 'var(--m-border)' }}>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {!outcome ? (
              <>
                <p className="text-[13px] font-medium">Pursue or pass?</p>
                <p className="text-[11px]" style={{ color: 'var(--m-muted)' }}>
                  {outcomeBlocked || 'Your signal improves the next brief\'s thesis band.'}
                </p>
              </>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>
                Marked <span className="font-medium" style={{ color: 'var(--m-text)' }}>{outcome}</span>
                {editCount > 0 && ` · ${editCount} edits`}
                {' · '}
                <button onClick={handleUndoOutcome} className="hover:underline" style={{ color: 'var(--m-accent)' }}>undo</button>
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {shareError && (
              <p className="w-full text-[11px] text-red-600 sm:w-auto">{shareError}</p>
            )}
            <button type="button" onClick={handleCopyShare} className="m-btn-ghost m-btn-sm">
              {shareCopied && !shareUrl ? 'Copied!' : 'Copy text'}
            </button>
            {shareEnabled && (
              <>
                <button type="button" onClick={handleCreateShareLink} className="m-btn-ghost m-btn-sm">
                  {shareCopied && shareUrl ? 'Link copied!' : 'Share link'}
                </button>
                {shareCopied && shareUrl && (
                  <span className="text-[11px] font-medium text-emerald-700">Ready to paste</span>
                )}
              </>
            )}
            {!outcome ? (
              <>
                <button onClick={() => handleOutcome('pass')} className="m-btn-secondary m-btn-sm px-5">
                  Pass
                </button>
                <button onClick={() => handleOutcome('pursue')} className="m-btn-accent m-btn-sm px-5">
                  Pursue
                </button>
              </>
            ) : (
              <>
                {showOutreachPrompt && (
                  <p className="mb-1 text-[11px] font-medium text-emerald-800">
                    Draft outreach to the founder?
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setOutreachOpen(true)}
                  className="m-btn-accent m-btn-sm"
                >
                  Draft outreach
                </button>
                <button type="button" onClick={handleDownloadPdf} disabled={pdfLoading} className="m-btn-secondary m-btn-sm">
                  {pdfLoading ? 'PDF…' : serverPdf ? 'Download PDF' : 'Print / PDF'}
                </button>
                {serverPdf && (
                  <button type="button" onClick={() => window.print()} className="m-btn-ghost m-btn-sm">
                    Print
                  </button>
                )}
                <Link href="/brief" className="m-btn-primary m-btn-sm">
                  Next brief →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {showOutcomeNudge && (
        <div className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="m-card m-card-pad w-full max-w-sm shadow-xl">
            <p className="text-[14px] font-medium">Mark this deal first?</p>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--m-muted)' }}>
              Pursue/pass signals train your fund&apos;s thesis band. You can skip if you&apos;re not ready.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => { handleOutcome('pass'); setShowOutcomeNudge(false) }} className="m-btn-secondary m-btn-sm">Pass</button>
              <button onClick={() => { handleOutcome('pursue'); setShowOutcomeNudge(false) }} className="m-btn-accent m-btn-sm">Pursue</button>
              <button
                onClick={() => {
                  setShowOutcomeNudge(false)
                  outcomeNudgeSkippedRef.current = true
                  if (pendingNavRef.current) window.location.href = pendingNavRef.current
                }}
                className="m-btn-ghost m-btn-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '5rem' }} aria-hidden />

      <OutreachDrawer
        open={outreachOpen}
        onClose={() => {
          setOutreachOpen(false)
          setShowOutreachPrompt(false)
        }}
        memoData={memoData}
        memoId={memoId}
        trackingId={trackingId}
        fundName={fundName}
        initialFounderName={memoData?.TEAM_1_NAME || ''}
        companyDomain={companyDomain}
      />
    </div>
  )
}
