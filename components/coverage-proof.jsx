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

  // The verified-miss / community-first case is the hero — render it as a stamp.
  const isStamp = communityFirst || verifiedMiss
  const chip = signalBased
    ? 'border-violet-500/40 bg-violet-500/10 text-violet-800'
    : isStamp
      ? '' // handled by m-stamp below
      : alsoPublic
        ? 'border-[color:var(--m-border-strong)] bg-[color:var(--m-surface-2)] text-[color:var(--m-muted)]'
        : 'border-amber-600/40 bg-amber-500/10 text-amber-800'

  if (compact) {
    if (isStamp) {
      return (
        <span className="m-stamp" title={ledger?.verification?.detail || coverage?.detail || coverage?.label}>
          Not in index
        </span>
      )
    }
    return (
      <span
        className={`inline-flex border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${chip}`}
        style={{ borderRadius: 'var(--m-radius-sm)' }}
        title={ledger?.verification?.detail || coverage?.detail || coverage?.label}
      >
        {signalBased
          ? 'Signal'
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

  const stampBox = isStamp
    ? 'border-[color:var(--m-accent-line)] bg-[color:var(--m-accent-soft)] text-[color:var(--m-accent-deep)]'
    : chip

  return (
    <div className={`mt-1.5 border px-2 py-1.5 ${stampBox}`} style={{ borderRadius: 'var(--m-radius-sm)', borderLeftWidth: isStamp ? '3px' : undefined }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
        {isStamp && <span className="m-stamp mr-1">Not in index</span>}
        <span>{ledger?.verification?.label || coverage?.label}</span>
        {indexTest?.testedAt && (
          <span className="font-mono text-[10px] opacity-80">
            checked {indexTest.testedAt}
          </span>
        )}
        {stage && (
          <span className="rounded bg-black/5 px-1 font-mono text-[9px] uppercase tracking-wide opacity-80">
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
