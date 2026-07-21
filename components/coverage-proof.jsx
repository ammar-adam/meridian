'use client'

/**
 * Visible data-wedge proof on each Flow/Discover row.
 */
export default function CoverageProof({ coverage, compact = false }) {
  if (!coverage?.label) return null

  const community = coverage.status === 'community_first'
  const alsoPublic = coverage.status === 'also_public'

  const chip = community
    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
    : alsoPublic
      ? 'border-zinc-300 bg-zinc-50 text-zinc-600'
      : 'border-amber-300 bg-amber-50 text-amber-900'

  if (compact) {
    return (
      <span
        className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${chip}`}
        title={coverage.detail || coverage.label}
      >
        {community ? 'Pre-index' : alsoPublic ? 'Public' : 'Unverified'}
      </span>
    )
  }

  return (
    <div className={`mt-1.5 rounded border px-2 py-1.5 ${chip}`} title={coverage.detail}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
        <span>{coverage.label}</span>
        {coverage.cohortDate && (
          <span className="font-mono text-[10px] opacity-80">First seen {coverage.cohortDate}</span>
        )}
      </div>
      {coverage.provenance && (
        <div className="mt-0.5 text-[10px] leading-snug opacity-90">{coverage.provenance}</div>
      )}
    </div>
  )
}
