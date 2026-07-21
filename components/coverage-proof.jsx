'use client'

/**
 * Visible data-wedge proof on each Flow/Discover row.
 * Combines coverage status with the verifiable freshness ledger.
 */
export default function CoverageProof({ coverage, ledger, stage, compact = false }) {
  if (!coverage?.label && !ledger) return null

  const community = coverage?.status === 'community_first'
  const alsoPublic = coverage?.status === 'also_public'
  const verifiedMiss = ledger?.verification?.status === 'verified_miss'

  const chip = community || verifiedMiss
    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
    : alsoPublic
      ? 'border-zinc-300 bg-zinc-50 text-zinc-600'
      : 'border-amber-300 bg-amber-50 text-amber-900'

  if (compact) {
    return (
      <span
        className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${chip}`}
        title={ledger?.verification?.detail || coverage?.detail || coverage?.label}
      >
        {verifiedMiss ? 'Not in index' : community ? 'Pre-index' : alsoPublic ? 'Public' : 'Community'}
      </span>
    )
  }

  const firstSeen = ledger?.firstSeen || coverage?.cohortDate
  const ageDays = ledger?.ageDays

  return (
    <div className={`mt-1.5 rounded border px-2 py-1.5 ${chip}`} title={ledger?.verification?.detail || coverage?.detail}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
        <span>{ledger?.verification?.label || coverage?.label}</span>
        {firstSeen && (
          <span className="font-mono text-[10px] opacity-80">
            First seen {firstSeen}{ageDays != null ? ` · ${ageDays}d` : ''}
          </span>
        )}
        {stage && (
          <span className="rounded bg-white/60 px-1 font-mono text-[9px] uppercase tracking-wide opacity-80">
            {stage}
          </span>
        )}
      </div>
      {(ledger?.provenance || coverage?.provenance) && (
        <div className="mt-0.5 text-[10px] leading-snug opacity-90">{ledger?.provenance || coverage?.provenance}</div>
      )}
    </div>
  )
}
