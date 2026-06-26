'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { populateTemplate } from '@/lib/populate-template'

export default function SharePage() {
  const params = useParams()
  const shareId = params?.id
  const [html, setHtml] = useState('')
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewerName, setReviewerName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!shareId) return
    fetch(`/api/share/${shareId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Share not found')
        }
        return res.json()
      })
      .then(async (payload) => {
        setMeta(payload.meta)
        if (payload.meta?.outcome) setSubmitted(true)
        const template = await fetch('/memo-template.html').then(r => r.text())
        setHtml(populateTemplate(template, payload.memoData))
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [shareId])

  async function submitOutcome(outcome) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/share/${shareId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, reviewerName, note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMeta(data.meta)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--m-bg)' }}>
        <span className="text-[13px]" style={{ color: 'var(--m-muted)' }}>Loading brief…</span>
      </div>
    )
  }

  if (error && !html) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: 'var(--m-bg)' }}>
        <p className="text-[14px] font-medium">Link unavailable</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>{error}</p>
      </div>
    )
  }

  const showActions = meta?.allowOutcome !== false

  return (
    <div>
      <div className="no-print fixed inset-x-0 top-0 z-40 border-b bg-white/95 px-4 py-3 backdrop-blur-sm" style={{ borderColor: 'var(--m-border)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-[13px] font-medium">{meta?.companyName}</p>
            <p className="text-[11px]" style={{ color: 'var(--m-muted)' }}>
              Shared via Meridian{meta?.fundName ? ` · ${meta.fundName}` : ''}
              {meta?.outcome && (
                <span className="ml-2 font-medium text-zinc-900">
                  · {meta.outcome === 'more_info' ? 'More info requested' : meta.outcome}
                  {meta.reviewerName ? ` by ${meta.reviewerName}` : ''}
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="m-btn-secondary m-btn-sm">
            Save PDF
          </button>
        </div>
      </div>
      <div
        style={{ width: '210mm', margin: '0 auto', paddingTop: '4rem', paddingBottom: showActions ? '8rem' : '2rem' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {showActions && (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-4 backdrop-blur-sm" style={{ borderColor: 'var(--m-border)' }}>
          <div className="mx-auto max-w-3xl">
            {submitted ? (
              <p className="text-center text-[13px] font-medium text-emerald-700">
                Response recorded — thank you.
              </p>
            ) : (
              <>
                <p className="mb-3 text-center text-[13px] font-medium">Your call on this deal?</p>
                <div className="mb-3 flex flex-wrap justify-center gap-2">
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={e => setReviewerName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="m-input max-w-xs text-[12px]"
                  />
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="m-input max-w-sm flex-1 text-[12px]"
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" disabled={submitting} onClick={() => submitOutcome('pass')} className="m-btn-secondary m-btn-sm">
                    Pass
                  </button>
                  <button type="button" disabled={submitting} onClick={() => submitOutcome('more_info')} className="m-btn-secondary m-btn-sm">
                    Need more info
                  </button>
                  <button type="button" disabled={submitting} onClick={() => submitOutcome('pursue')} className="m-btn-accent m-btn-sm">
                    Pursue
                  </button>
                </div>
              </>
            )}
            {error && html && <p className="mt-2 text-center text-[12px] text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
