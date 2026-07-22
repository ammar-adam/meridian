'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Founder claim — get seen by Canadian funds before you announce.
 * The start of the attestation flywheel: founders correct and own their rows.
 */
export default function ClaimPage() {
  const [companyName, setCompanyName] = useState('')
  const [founderName, setFounderName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, founderName, email, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStatus('done')
    } catch (err) {
      setStatus('idle')
      setError(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <p className="m-kicker mb-2">Meridian · for founders</p>
      <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">
        Get seen by Canadian funds before you announce
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
        Meridian surfaces community-sourced Canadian companies to early-stage funds —
        with receipts. If your company is (or should be) on our ledger, claim your
        profile: confirm your founders, correct anything wrong, and control what
        funds see before anything is public anywhere else.
      </p>

      {status === 'done' ? (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-[15px] font-medium text-emerald-900">Claim received.</p>
          <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">
            We review every claim by hand — preferably from an email at your company
            domain. Once verified, your record shows a dated
            &ldquo;Founder-confirmed&rdquo; mark to every fund watching your space.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="m-kicker mb-1 block">Company name *</label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="m-input w-full text-[14px]"
              placeholder="e.g. Simantic"
              required
            />
          </div>
          <div>
            <label className="m-kicker mb-1 block">Your name</label>
            <input
              value={founderName}
              onChange={e => setFounderName(e.target.value)}
              className="m-input w-full text-[14px]"
              placeholder="Founder / co-founder"
            />
          </div>
          <div>
            <label className="m-kicker mb-1 block">Email * <span className="normal-case tracking-normal text-zinc-400">(company-domain email speeds verification)</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="m-input w-full text-[14px]"
              placeholder="you@yourcompany.com"
              required
            />
          </div>
          <div>
            <label className="m-kicker mb-1 block">Corrections or context</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="m-textarea w-full text-[14px]"
              placeholder="Correct founders, stage, one-liner — or tell us you're raising."
            />
          </div>
          {/* Honeypot — humans never see this */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          {error && <p className="m-alert-error text-[13px]">{error}</p>}
          <button type="submit" disabled={status === 'sending'} className="m-btn-primary">
            {status === 'sending' ? 'Sending…' : 'Claim my profile'}
          </button>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Claims are reviewed manually. We never mark a record founder-confirmed
            without verification, and we never sell or share your contact details.
          </p>
        </form>
      )}

      <p className="mt-10 text-[12px] text-zinc-500">
        Investor? <Link href="/flow" className="text-zinc-800 underline">Open Deal Flow</Link>
      </p>
    </div>
  )
}
