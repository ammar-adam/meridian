'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Public earliness scoreboard — every number traces to a ledger row.
 * Until index checks accrue, shows an honest empty/accruing state.
 */
export default function EarlinessPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/benchmark')
      .then(r => r.json())
      .then(setData)
      .catch(err => setError(err.message || 'Failed to load benchmark'))
  }, [])

  const stats = data?.stats
  const ledgerSince = stats?.ledgerSince
    ? String(stats.ledgerSince).slice(0, 10)
    : null
  const checks = stats?.entitiesChecked ?? 0
  const misses = stats?.verifiedMisses ?? 0
  const accruing = !data?.enabled || checks === 0

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link href="/" className="flex items-center gap-3">
        <div className="m-logo text-[12px]">M</div>
        <span className="text-[15px] font-semibold">Meridian</span>
      </Link>

      <p className="m-kicker mb-2 mt-10">Earliness scoreboard</p>
      <h1 className="text-[28px] font-semibold tracking-tight text-[color:var(--m-text)]">
        How early we are — with receipts
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
        Accruing since {ledgerSince || 'ledger launch'}. We only claim absence where a dated check exists.
      </p>

      {error && (
        <p className="m-alert-error mt-6">{error}</p>
      )}

      {!error && !data && (
        <p className="mt-8 text-[14px]" style={{ color: 'var(--m-muted)' }}>Loading ledger…</p>
      )}

      {data && !data.enabled && (
        <div className="mt-8 rounded-xl border border-amber-700/40 bg-amber-500/10 px-4 py-3 text-[14px] text-amber-800">
          Ledger not configured yet. Numbers will appear once the truth ledger is live.
        </div>
      )}

      {data?.enabled && (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Stat label="Entities on ledger" value={stats.entities ?? 0} />
            <Stat label="Entities checked" value={checks} />
            <Stat label="Verified misses" value={misses} />
            <Stat
              label="Median miss age"
              value={stats.medianMissAgeDays != null ? `${stats.medianMissAgeDays}d` : '—'}
            />
          </div>

          {accruing ? (
            <div className="mt-6 rounded-xl border px-4 py-4 text-[14px] leading-relaxed text-[color:var(--m-muted)]" style={{ background: 'var(--m-surface-2)', borderColor: 'var(--m-border)' }}>
              <p className="font-medium text-[color:var(--m-text)]">Accruing — no invented numbers</p>
              <p className="mt-1">
                Index checks run on a schedule. Until a dated check exists for a company,
                we do not claim it is missing from public indexes. Zero verified misses on day one
                is the correct, honest state.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-[color:var(--m-accent-line)] bg-[color:var(--m-accent-soft)] px-4 py-4 text-[14px] leading-relaxed text-[color:var(--m-forest)]">
              <p className="font-medium">
                {misses} verified miss{misses === 1 ? '' : 'es'} from {checks} checked entit{checks === 1 ? 'y' : 'ies'}.
              </p>
              <p className="mt-1 opacity-90">
                Each miss is a stored StartupHub name search with a date. Repeat any row yourself.
              </p>
            </div>
          )}

          {data.honesty?.claim && (
            <p className="mt-6 text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
              {data.honesty.claim}
            </p>
          )}
        </>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/pilot" className="m-btn-primary">Coverage proof</Link>
        <Link href="/flow" className="m-btn-secondary">Open Deal Flow</Link>
        <Link href="/about" className="m-btn-secondary">About</Link>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ background: 'var(--m-surface)', borderColor: 'var(--m-border)' }}>
      <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--m-muted)' }}>{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-tight text-[color:var(--m-text)]">{value}</div>
    </div>
  )
}
