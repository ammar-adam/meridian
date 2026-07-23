'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getFundProfile, getActiveStrategy, getTrackingId } from '@/lib/fund-profile'
import { computeGpForwardMetrics, exportGpMetricsCsv } from '@/lib/gp-metrics'

export default function GpValidationCard() {
  const [metrics, setMetrics] = useState(null)
  const [copied, setCopied] = useState(false)

  function load() {
    const profile = getFundProfile()
    const strategy = getActiveStrategy(profile)
    const tid = profile && strategy ? getTrackingId(profile, strategy) : 'guest'
    setMetrics(computeGpForwardMetrics(tid))
  }

  useEffect(() => {
    load()
    window.addEventListener('meridian-context-change', load)
    return () => window.removeEventListener('meridian-context-change', load)
  }, [])

  if (!metrics) return null

  async function copyCsv() {
    await navigator.clipboard.writeText(exportGpMetricsCsv(metrics))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { betaProgress } = metrics

  return (
    <div className="m-card m-card-pad mb-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-kicker mb-1">GP-forward validation</p>
          <p className="text-[13px] font-medium">{metrics.validationMessage}</p>
        </div>
        <button type="button" onClick={copyCsv} className="m-btn-ghost m-btn-sm">
          {copied ? 'Copied' : 'Export CSV'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <BetaMeter label="Briefs" progress={betaProgress.briefs} />
        <BetaMeter label="Pursue" progress={betaProgress.pursue} />
        <BetaMeter label="GP-forward" progress={betaProgress.gpForward} isPercent />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="GP-forward rate" value={metrics.gpForwardRate != null ? `${(metrics.gpForwardRate * 100).toFixed(0)}%` : '—'} hint="Pursued with no thesis edits" />
        <MiniStat label="Zero-edit forward" value={metrics.zeroEditForwardRate != null ? `${(metrics.zeroEditForwardRate * 100).toFixed(0)}%` : '—'} hint="Pursued with zero edits" />
        <MiniStat label="Thesis edit rate" value={metrics.thesisEditRate != null ? `${(metrics.thesisEditRate * 100).toFixed(0)}%` : '—'} />
        <MiniStat label="Reviewed" value={metrics.reviewed} />
      </div>

      {metrics.betaReady && (
        <p className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-200">
          Ready for GP review — forward a pursue memo without editing the thesis band.
        </p>
      )}

      {!metrics.betaReady && metrics.totalBriefs > 0 && (
        <Link href="/brief" className="mt-3 inline-block text-[12px] font-medium hover:underline" style={{ color: 'var(--m-accent)' }}>
          Run another brief →
        </Link>
      )}
    </div>
  )
}

function BetaMeter({ label, progress, isPercent }) {
  const pct = isPercent
    ? Math.min(100, (progress.current ?? 0) * 100)
    : Math.min(100, (progress.current / progress.target) * 100)

  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="font-medium">{label}</span>
        <span style={{ color: 'var(--m-muted)' }}>
          {isPercent
            ? (progress.current != null ? `${(progress.current * 100).toFixed(0)}%` : '—')
            : `${progress.current}/${progress.target}`}
          {progress.met ? ' ✓' : ''}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--m-border)' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: progress.met ? '#059669' : 'var(--m-text)' }}
        />
      </div>
    </div>
  )
}

function MiniStat({ label, value, hint }) {
  return (
    <div>
      <div className="text-[18px] font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] font-medium" style={{ color: 'var(--m-muted)' }}>{label}</div>
      {hint && <div className="text-[10px]" style={{ color: 'var(--m-muted-2)' }}>{hint}</div>}
    </div>
  )
}
