'use client'

import { useMemo, useState } from 'react'
import { buildFlowDigest, digestMailto } from '@/lib/flow-digest'

/**
 * Monday digest card — copy, email, optional Slack post.
 */
export default function FlowDigestCard({ fundName, thesis, companies }) {
  const [copied, setCopied] = useState(false)
  const [slackState, setSlackState] = useState(null)
  const [busy, setBusy] = useState(false)

  const digest = useMemo(
    () => buildFlowDigest({ fundName, thesis, companies: companies || [] }),
    [fundName, thesis, companies],
  )

  async function copyDigest() {
    try {
      await navigator.clipboard.writeText(digest.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function sendSlack() {
    setBusy(true)
    setSlackState(null)
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesis,
          fundContext: { fundName, thesis },
          companies,
          postSlack: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Digest failed')
      setSlackState(data.slack?.sent ? 'sent' : (data.slack?.reason || 'not sent'))
    } catch (err) {
      setSlackState(err.message || 'failed')
    } finally {
      setBusy(false)
    }
  }

  if (!companies?.length) return null

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white px-5 py-4">
      <p className="m-kicker mb-1">Monday digest</p>
      <h3 className="text-[16px] font-semibold tracking-tight text-zinc-900">
        {digest.stats.newCount || digest.stats.freshCount} companies worth a look for {fundName}
      </h3>
      <p className="mt-1 text-[13px] text-zinc-600">
        {digest.stats.communityFirst} before public indexes · {digest.stats.reachable} reachable founders · copy or Slack your team
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copyDigest} className="m-btn-primary m-btn-sm">
          {copied ? 'Copied' : 'Copy digest'}
        </button>
        <a href={digestMailto(digest)} className="m-btn-secondary m-btn-sm">
          Email digest
        </a>
        <button type="button" onClick={sendSlack} disabled={busy} className="m-btn-ghost m-btn-sm">
          {busy ? 'Sending…' : 'Send to Slack'}
        </button>
      </div>
      {slackState && (
        <p className="mt-2 text-[11px] text-zinc-500">
          Slack: {slackState === 'sent' ? 'posted' : slackState}
        </p>
      )}
    </div>
  )
}
