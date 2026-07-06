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
  const [emailGuesses, setEmailGuesses] = useState([])
  const [emailLoading, setEmailLoading] = useState(false)
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
    setEmailGuesses([])
    setError('')
    setCopied(false)
    originalsRef.current = { subject: '', body: '' }
  }, [open, initialFounderName, memoData])

  const lookupEmails = useCallback(async (name, domain) => {
    const trimmed = name?.trim()
    if (!trimmed || !domain) {
      setEmailGuesses([])
      return
    }
    setEmailLoading(true)
    try {
      const res = await fetch('/api/founder-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderName: trimmed, domain }),
      })
      const data = await res.json()
      if (res.ok) setEmailGuesses(data.candidates || [])
      else setEmailGuesses([])
    } catch {
      setEmailGuesses([])
    } finally {
      setEmailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open || !founderName.trim() || !companyDomain) {
      setEmailGuesses([])
      return
    }
    const timer = setTimeout(() => lookupEmails(founderName, companyDomain), 400)
    return () => clearTimeout(timer)
  }, [open, founderName, companyDomain, lookupEmails])

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
      <div className="relative flex h-full w-full max-w-lg flex-col border-l bg-white shadow-xl" style={{ borderColor: 'var(--m-border)' }}>
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

          {founderName.trim() && companyDomain && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2">
              <p className="text-[11px] font-medium text-amber-900">Unverified email guesses — confirm before sending</p>
              {emailLoading && (
                <p className="mt-1 text-[11px] text-amber-800">Looking up patterns…</p>
              )}
              {!emailLoading && emailGuesses.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-800">No pattern guesses (need first + last name).</p>
              )}
              {!emailLoading && emailGuesses.slice(0, 2).map(g => (
                <p key={g.email} className="mt-1 text-[12px] text-amber-950">
                  <span className="font-mono">{g.email}</span>
                  <span className="ml-2 text-[10px] text-amber-700">({g.confidence})</span>
                </p>
              ))}
            </div>
          )}

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
                <p className="rounded-md bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
                  <span className="font-medium text-zinc-800">Built around:</span> {personalizationSource}
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
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
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
