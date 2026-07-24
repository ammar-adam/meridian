'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logEdit } from '@/lib/edit-tracker'
import { resolveApiFundContext } from '@/lib/fund-profile'

export default function OutreachDrawer({
  open,
  onClose,
  memoData,
  memoId,
  trackingId,
  fundName,
  companyDomain = '',
  initialFounderName = '',
}) {
  const [founderName, setFounderName] = useState(initialFounderName)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [personalizationSource, setPersonalizationSource] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const originalsRef = useRef({ subject: '', body: '' })

  useEffect(() => {
    if (!open) return
    setFounderName(initialFounderName || memoData?.TEAM_1_NAME || '')
    setSubject('')
    setBody('')
    setPersonalizationSource('')
    setError('')
    setCopied(false)
    originalsRef.current = { subject: '', body: '' }
  }, [open, initialFounderName, memoData])

  const generate = useCallback(async () => {
    if (!memoData) return
    setGenerating(true)
    setError('')
    try {
      const fundContext = resolveApiFundContext()
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoData,
          fundContext,
          founderName: founderName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      const nextSubject = data.outreach.subject || ''
      const nextBody = data.outreach.body || ''
      setSubject(nextSubject)
      setBody(nextBody)
      setPersonalizationSource(data.outreach.personalizationSource || '')
      originalsRef.current = { subject: nextSubject, body: nextBody }
    } catch (err) {
      setError(err.message || 'Could not generate outreach')
    } finally {
      setGenerating(false)
    }
  }, [memoData, founderName])

  function trackEdit(fieldName, originalValue, newValue) {
    if (!memoId || newValue === originalValue) return
    logEdit({
      memoId,
      companyName: memoData?.COMPANY_NAME,
      fundName: fundName || memoData?.FUND_NAME,
      trackingId,
      fieldName,
      originalValue,
      newValue,
      section: 'outreach',
    })
  }

  function handleSubjectBlur() {
    trackEdit('outreach_subject', originalsRef.current.subject, subject)
    if (subject !== originalsRef.current.subject) {
      originalsRef.current.subject = subject
    }
  }

  function handleBodyBlur() {
    trackEdit('outreach_body', originalsRef.current.body, body)
    if (body !== originalsRef.current.body) {
      originalsRef.current.body = body
    }
  }

  async function handleCopy() {
    const text = `Subject: ${subject}\n\n${body}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return null

  const hasDraft = Boolean(subject || body)

  return (
    <div className="no-print fixed inset-0 z-[70] flex justify-end bg-black/30">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close outreach drawer"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l shadow-xl" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--m-border)' }}>
          <div>
            <p className="text-[14px] font-semibold">Draft outreach</p>
            <p className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
              Personalized cold email for {memoData?.COMPANY_NAME}
            </p>
          </div>
          <button type="button" onClick={onClose} className="m-btn-ghost m-btn-sm">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="m-kicker mb-1 block">Founder name (optional)</label>
          <input
            value={founderName}
            onChange={(e) => setFounderName(e.target.value)}
            placeholder="From research or LinkedIn"
            className="m-input mb-2 text-[13px]"
          />

          {!hasDraft ? (
            <div className="rounded-md border border-dashed p-6 text-center" style={{ borderColor: 'var(--m-border)' }}>
              <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>
                Generate a specific outreach email grounded in this brief&apos;s research and your fund context.
              </p>
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="m-btn-accent m-btn-sm mt-4"
              >
                {generating ? 'Generating…' : 'Generate outreach'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {personalizationSource && (
                <p className="rounded-md px-3 py-2 text-[11px] leading-relaxed" style={{ background: 'var(--m-surface-2)', color: 'var(--m-muted)' }}>
                  <span className="font-medium text-[color:var(--m-muted)]">Built around:</span> {personalizationSource}
                </p>
              )}

              <div>
                <label className="m-kicker mb-1 block">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onBlur={handleSubjectBlur}
                  className="m-input w-full text-[13px] font-medium"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="m-kicker mb-1 block">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onBlur={handleBodyBlur}
                  rows={12}
                  className="m-textarea w-full text-[13px] leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12px] text-red-300">{error}</p>
          )}
        </div>

        {hasDraft && (
          <div className="flex flex-wrap items-center gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--m-border)' }}>
            <button type="button" onClick={handleCopy} className="m-btn-primary m-btn-sm">
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button type="button" onClick={generate} disabled={generating} className="m-btn-secondary m-btn-sm">
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
