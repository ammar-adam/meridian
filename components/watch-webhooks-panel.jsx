'use client'

import { useEffect, useState } from 'react'
import { WEBHOOK_EVENT_TYPES } from '@/lib/watch-webhooks-shared'

const EVENT_LABELS = {
  strong_match: 'Strong thesis match (fit ≥ 80)',
  verified_miss: 'Verified index miss',
  new_since_last_visit: 'New since last visit',
  serial_founder: 'Serial founder',
}

/**
 * Register watch webhook URLs — Fund settings panel.
 */
export default function WatchWebhooksPanel() {
  const [enabled, setEnabled] = useState(null)
  const [webhooks, setWebhooks] = useState([])
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState(new Set(WEBHOOK_EVENT_TYPES))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/webhooks')
      const data = await res.json()
      setEnabled(data.enabled)
      setWebhooks(data.webhooks || [])
    } catch {
      setEnabled(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleEvent(type) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  async function register(e) {
    e.preventDefault()
    if (!url.trim()) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), events: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setUrl('')
      setMessage('Webhook registered')
      await load()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(hookUrl) {
    setBusy(true)
    try {
      await fetch(`/api/webhooks?url=${encodeURIComponent(hookUrl)}`, { method: 'DELETE' })
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (enabled === false) {
    return (
      <div className="m-card m-card-pad mt-6">
        <p className="m-kicker mb-1">Watch webhooks</p>
        <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>
          Set <code className="font-mono text-[12px]">DATABASE_URL</code> on Vercel to register webhook URLs for strong matches, verified misses, and new companies.
        </p>
      </div>
    )
  }

  if (enabled === null) return null

  return (
    <div className="m-card m-card-pad mt-6">
      <p className="m-kicker mb-1">Watch webhooks</p>
      <p className="mb-4 text-[13px]" style={{ color: 'var(--m-muted)' }}>
        POST JSON to your endpoint when Flow, scout cron, or watch-events cron detects matches. Also fires on Flow refresh when events are present.
      </p>

      <form onSubmit={register} className="space-y-3">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="m-input font-mono"
          placeholder="https://hooks.example.com/meridian"
        />
        <div className="flex flex-wrap gap-2">
          {WEBHOOK_EVENT_TYPES.map(type => (
            <label key={type} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]">
              <input
                type="checkbox"
                checked={selected.has(type)}
                onChange={() => toggleEvent(type)}
              />
              {EVENT_LABELS[type] || type}
            </label>
          ))}
        </div>
        <button type="submit" disabled={busy} className="m-btn-secondary m-btn-sm">
          {busy ? 'Saving…' : 'Register webhook'}
        </button>
      </form>

      {message && <p className="mt-2 text-[12px] text-zinc-600">{message}</p>}

      {webhooks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {webhooks.map(h => (
            <li key={h.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-[12px]">
              <div className="min-w-0">
                <p className="truncate font-mono">{h.url}</p>
                <p className="text-zinc-500">{(h.events || []).join(', ')}</p>
              </div>
              <button type="button" onClick={() => remove(h.url)} className="m-btn-ghost m-btn-sm shrink-0">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
