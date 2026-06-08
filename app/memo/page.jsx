'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { populateTemplate } from '@/lib/populate-template'
import { nationgraphData } from '@/lib/nationgraph-data'
import { saveMemo } from '@/lib/memo-library'
import { logEdit, logOutcome, getEditsForMemo } from '@/lib/edit-tracker'
import { SAGARD_CONTEXT } from '@/lib/fund-context'

const TRACKING_ID = SAGARD_CONTEXT.trackingId

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
  const [html, setHtml] = useState('')
  const [memoData, setMemoData] = useState(null)
  const [memoId, setMemoId] = useState('')
  const [loading, setLoading] = useState(true)
  const [memoRendered, setMemoRendered] = useState(false)
  const [qualityGate, setQualityGate] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [editCount, setEditCount] = useState(0)
  const memoRef = useRef(null)
  const memoDataRef = useRef(null)

  useEffect(() => {
    memoDataRef.current = memoData
  }, [memoData])

  useEffect(() => {
    let data = nationgraphData
    let source = 'demo'
    let qg = null
    let id = sessionStorage.getItem('memoId')

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
      // fall back to demo data
    }

    if (!id) {
      const slug = (data.COMPANY_NAME ?? 'memo').toLowerCase().replace(/\s+/g, '_')
      id = `${slug}_${Date.now()}`
      sessionStorage.setItem('memoId', id)
    }

    if (source === 'pipeline') {
      saveMemo(data, id)
    }

    setMemoId(id)
    setMemoData(data)
    setEditCount(getEditsForMemo(id).filter(e => e.fieldName !== '_outcome').length)

    if (qg && !qg.passed) {
      setBlocked(true)
      setLoading(false)
      return
    }

    fetch('/memo-template.html')
      .then((res) => res.text())
      .then((template) => {
        setHtml(populateTemplate(template, data))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!html) return
    setMemoRendered(true)
  }, [html])

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
      trackingId: TRACKING_ID,
      fieldName,
      originalValue,
      newValue,
    })

    const updated = { ...current, [fieldName]: newValue }
    persistMemoData(updated)
    setEditCount(c => c + 1)
  }, [memoId, persistMemoData])

  useEffect(() => {
    if (!memoRendered || !memoRef.current || !memoData) return

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
          onFieldEdit(fieldName, currentValue, newValue)
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
  }, [memoRendered, memoData, onFieldEdit])

  function handleOutcome(selected) {
    const captured = captureMemoFromDom(memoRef.current)
    const current = memoDataRef.current
    if (current && Object.keys(captured).length) {
      persistMemoData({ ...current, ...captured })
    }

    const edits = memoId ? getEditsForMemo(memoId).filter(e => e.fieldName !== '_outcome').length : editCount

    setOutcome(selected)
    if (!current || !memoId) return

    logOutcome({
      memoId,
      companyName: current.COMPANY_NAME,
      fundName: current.FUND_NAME,
      trackingId: TRACKING_ID,
      outcome: selected,
      editCount: edits,
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading memo…
      </div>
    )
  }

  if (blocked && qualityGate && !qualityGate.passed) {
    const errors = qualityGate.flags.filter(f => f.severity === 'error')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-red-800">
            Memo failed quality checks
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            This memo has errors that must be resolved before showing to a GP.
          </p>
          <ul className="space-y-2">
            {errors.map((flag, i) => (
              <li key={i} className="text-xs text-red-700">
                <span className="font-medium">{flag.field}:</span> {flag.message}
              </li>
            ))}
          </ul>
          <a href="/" className="mt-6 inline-block text-xs text-gray-600 underline hover:text-gray-900">
            ← Try another company
          </a>
        </div>
      </div>
    )
  }

  const warnings = qualityGate?.flags?.filter(f => f.severity === 'warn') ?? []
  const bannerOffset = warnings.length > 0 && !bannerDismissed

  return (
    <div>
      {bannerOffset && (
        <div className="no-print fixed inset-x-0 top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-amber-800">Verify before sharing</p>
              <ul className="mt-1 space-y-0.5">
                {warnings.map((flag, i) => (
                  <li key={i} className="text-xs text-amber-700">{flag.message}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setBannerDismissed(true)} className="shrink-0 text-xs text-amber-600 hover:text-amber-800">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {editCount > 0 && (
        <div className="no-print fixed left-4 top-4 z-50 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500 shadow-sm">
          {editCount} edit{editCount !== 1 ? 's' : ''} saved
        </div>
      )}

      <div
        ref={memoRef}
        style={{ width: '210mm', margin: '0 auto', paddingTop: bannerOffset ? '3rem' : 0 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="no-print fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {!outcome && (
          <div className="flex gap-2">
            <button
              onClick={() => handleOutcome('pass')}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-500 shadow-sm transition-all hover:border-gray-400"
            >
              Pass
            </button>
            <button
              onClick={() => handleOutcome('pursue')}
              className="rounded-lg bg-[#8B1A1A] px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#7a1616]"
            >
              Pursue
            </button>
          </div>
        )}

        {outcome && (
          <div className="rounded-lg border border-gray-100 bg-white px-4 py-2 text-xs text-gray-400 shadow-sm">
            Marked as {outcome}
            {editCount > 0 && ` · ${editCount} edits logged`} ·{' '}
            <button onClick={() => setOutcome(null)} className="underline hover:text-gray-600">
              undo
            </button>
          </div>
        )}

        <button
          onClick={() => {
            const captured = captureMemoFromDom(memoRef.current)
            if (memoDataRef.current && Object.keys(captured).length) {
              persistMemoData({ ...memoDataRef.current, ...captured })
            }
            // TODO V1.5: replace with /api/export Playwright PDF route
            window.print()
          }}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-gray-400"
        >
          Save as PDF
        </button>
      </div>
    </div>
  )
}
