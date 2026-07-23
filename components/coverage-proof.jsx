'use client'

/**
 * Visible data-wedge proof on each Flow/Discover row.
 * Combines coverage status with the verifiable freshness ledger.
 */
export default function CoverageProof({ coverage, ledger, stage, compact = false }) {
  if (!coverage?.label && !ledger) return null

  const communityFirst = coverage?.status === 'community_first'
  const communitySourced = coverage?.status === 'community_sourced'
  const alsoPublic = coverage?.status === 'also_public'
  const verifiedMiss = ledger?.verification?.status === 'verified_miss'
  const signalBased = ledger?.verification?.status === 'signal_based'

  const chip = signalBased
    ? 'border-violet-400/40 bg-violet-400/10 text-violet-200'
    : communityFirst || verifiedMiss
      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
      : alsoPublic
        ? 'border-white/15 bg-white/5 text-white/60'
        : 'border-amber-400/40 bg-amber-400/10 text-amber-200'

  if (compact) {
    return (
      <span
        className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${chip}`}
        title={ledger?.verification?.detail || coverage?.detail || coverage?.label}
      >
        {signalBased
          ? 'Signal'
          : verifiedMiss || communityFirst
            ? 'Not in index'
            : alsoPublic
              ? 'Public'
              : communitySourced
                ? 'Community'
                : 'Unchecked'}
      </span>
    )
  }

  const firstSeen = ledger?.firstSeen || coverage?.cohortDate
  const ageDays = ledger?.ageDays
  const meridianFirstSeen = ledger?.meridianFirstSeen
  const indexTest = ledger?.indexTest

  return (
    <div className={`mt-1.5 rounded border px-2 py-1.5 ${chip}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
        <span>{ledger?.verification?.label || coverage?.label}</span>
        {indexTest?.testedAt && (
          <span className="font-mono text-[10px] opacity-80">
            checked {indexTest.testedAt}
          </span>
        )}
        {stage && (
          <span className="rounded bg-white/60 px-1 font-mono text-[9px] uppercase tracking-wide opacity-80">
            {stage}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] opacity-80">
        {firstSeen && (
          <span>Cohort {firstSeen}{ageDays != null ? ` · ${ageDays}d ago` : ''}</span>
        )}
        {meridianFirstSeen && (
          <span title="When Meridian first recorded this company (server-side ledger)">
            On Meridian since {String(meridianFirstSeen).slice(0, 10)}
          </span>
        )}
      </div>
      {(ledger?.provenance || coverage?.provenance) && (
        <div className="mt-0.5 text-[10px] leading-snug opacity-90">{ledger?.provenance || coverage?.provenance}</div>
      )}
      {ledger?.verification?.detail && (
        <div className="mt-0.5 text-[10px] leading-snug opacity-75">{ledger.verification.detail}</div>
      )}
    </div>
  )
}
