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
        className={`${compact ? 'text-[10px]' : ''} m-badge-high border border-emerald-300 bg-emerald-50 text-emerald-900`}
        title={enriched ? 'Incubator cohort with structured founders/domain' : 'Pre-vetted incubator cohort'}
      >
        {label}
      </span>
    )
  }

  if (source === 'grant') {
    return (
      <span className={`${compact ? 'text-[10px]' : ''} m-badge-mid border border-sky-300 bg-sky-50 text-sky-900`} title="Public grant recipient disclosure">
        {label}
      </span>
    )
  }

  if (source === 'scout') {
    return (
      <span className={`${compact ? 'text-[10px]' : ''} m-badge-low border border-violet-300 bg-violet-50 text-violet-900`} title="AI-researched candidate — unverified">
        {label}
      </span>
    )
  }

  if (isLow || source === 'domain_registry') {
    return (
      <span className={`${compact ? 'text-[10px]' : ''} m-badge-low border border-amber-300 bg-amber-50 text-amber-900`} title="Weak or pre-announcement signal — verify before outreach">
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
