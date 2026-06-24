/** Client-safe cost + reuse constants */

export const MEMO_REUSE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** Approximate USD per brief (deep research + Claude) */
export const ESTIMATED_BRIEF_COST_USD = 0.25

/** Approximate USD per discover search */
export const ESTIMATED_DISCOVER_COST_USD = 0.1

export function estimateBatchCost(count) {
  return (Math.max(0, count) * ESTIMATED_BRIEF_COST_USD).toFixed(2)
}

export function formatBriefAge(isoDate) {
  if (!isoDate) return ''
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(isoDate).toLocaleDateString()
}
