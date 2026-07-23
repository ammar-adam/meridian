'use client'

import { sourceTypeLabel, isCommunitySourceType, LOW_CONFIDENCE_SOURCES } from '@/lib/source-type'

/**
 * Source-type badge with honest labels (incubator, grant, scout, registry, etc.).
 */
export default function SourceTypeBadge({ source, unverified, sourceConfidence, compact = false }) {
  const label = sourceTypeLabel(source)
  const isStealth = unverified || source === 'stealth_signal' || source === 'evertrace'
  const isLow = LOW_CONFIDENCE_SOURCES.has(source) || isStealth

  if (source === 'incubator') {
    const enriched = sourceConfidence === 'high'
    return (
      <span
        className={`${compact ? 'text-[10px]' : ''} m-badge-high`}
        title={enriched ? 'Incubator cohort with structured founders/domain' : 'Pre-vetted incubator cohort'}
      >
        {label}
      </span>
    )
  }

  if (source === 'grant') {
    return (
      <span className={`${compact ? 'text-[10px]' : ''} m-badge inline-flex border border-sky-400/40 bg-sky-400/10 text-sky-200`} title="Public grant recipient disclosure">
        {label}
      </span>
    )
  }

  if (source === 'scout') {
    return (
      <span className={`${compact ? 'text-[10px]' : ''} m-badge inline-flex border border-violet-400/40 bg-violet-400/10 text-violet-200`} title="AI-researched candidate — unverified">
        {label}
      </span>
    )
  }

  if (isLow || source === 'domain_registry') {
    return (
      <span className={`${compact ? 'text-[10px]' : ''} m-badge inline-flex border border-amber-400/40 bg-amber-400/10 text-amber-200`} title="Weak or pre-announcement signal — verify before outreach">
        {source === 'domain_registry' ? label : 'Stealth · unverified'}
      </span>
    )
  }

  if (isCommunitySourceType(source)) {
    return (
      <span className={`${compact ? 'text-[10px]' : ''} m-badge-mid`} title={label}>
        {label}
      </span>
    )
  }

  return (
    <span className={`${compact ? 'text-[10px]' : ''} m-badge-low uppercase`} title={label}>
      {label}
    </span>
  )
}
