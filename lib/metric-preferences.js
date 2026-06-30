/**
 * Fund-scoped metric priorities for STAT_1/2/3 slots.
 * Explicit preferences from setup + implicit boosts from edit history.
 */

export const METRIC_CATALOG = [
  { id: 'arr', label: 'ARR / revenue', defaultLabel: 'ARR' },
  { id: 'last_round', label: 'Last round', defaultLabel: 'Last round' },
  { id: 'total_raised', label: 'Total raised', defaultLabel: 'Total raised' },
  { id: 'valuation', label: 'Valuation', defaultLabel: 'Post-money valuation' },
  { id: 'customer_traction', label: 'Customers / logos', defaultLabel: 'Enterprise customers' },
  { id: 'users', label: 'Users / usage', defaultLabel: 'Active users' },
  { id: 'tam', label: 'Market size (TAM)', defaultLabel: 'Addressable market' },
  { id: 'headcount', label: 'Team size', defaultLabel: 'Employees' },
  { id: 'founded', label: 'Year founded', defaultLabel: 'Founded' },
  { id: 'growth', label: 'Growth rate', defaultLabel: 'YoY growth' },
]

export const DEFAULT_METRIC_PREFERENCES = ['total_raised', 'customer_traction', 'tam']

const METRIC_BY_ID = Object.fromEntries(METRIC_CATALOG.map(m => [m.id, m]))

const KEYWORD_TO_METRIC = [
  { re: /\barr\b|annual recurring|revenue run.?rate/i, id: 'arr' },
  { re: /series [a-e]|seed round|last round|latest round/i, id: 'last_round' },
  { re: /total raised|funding to date|capital raised/i, id: 'total_raised' },
  { re: /valuation|post.?money|pre.?money/i, id: 'valuation' },
  { re: /customer|client|logo|enterprise account/i, id: 'customer_traction' },
  { re: /\busers?\b|active users|dau|mau/i, id: 'users' },
  { re: /\btam\b|sam\b|market size|addressable market/i, id: 'tam' },
  { re: /employee|headcount|team size/i, id: 'headcount' },
  { re: /founded/i, id: 'founded' },
  { re: /growth|yoy|year over year/i, id: 'growth' },
]

export function getMetricDef(id) {
  return METRIC_BY_ID[id] || null
}

export function normalizeMetricPreferences(prefs) {
  if (!Array.isArray(prefs) || !prefs.length) return [...DEFAULT_METRIC_PREFERENCES]
  const seen = new Set()
  const out = []
  for (const id of prefs) {
    if (!METRIC_BY_ID[id] || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= 3) break
  }
  return out.length ? out : [...DEFAULT_METRIC_PREFERENCES]
}

/** Infer metric interest from STAT field edits in the edit log */
export function inferMetricBoostsFromEdits(editLog, trackingId) {
  const boosts = new Map()
  const scoped = (editLog || []).filter(
    e => (e.trackingId ?? e.fundName) === trackingId && e.fieldName?.startsWith('STAT_'),
  )

  for (const entry of scoped) {
    const text = `${entry.newValue || ''} ${entry.originalValue || ''}`
    for (const { re, id } of KEYWORD_TO_METRIC) {
      if (re.test(text)) {
        boosts.set(id, (boosts.get(id) || 0) + 1)
      }
    }
  }

  return [...boosts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([id, count]) => ({ id, count }))
}

export function mergeMetricPreferences(explicit, inferredBoosts = []) {
  const base = normalizeMetricPreferences(explicit)
  const boosted = [...base]

  for (const { id } of inferredBoosts) {
    if (!METRIC_BY_ID[id]) continue
    const idx = boosted.indexOf(id)
    if (idx > 0) {
      boosted.splice(idx, 1)
      boosted.unshift(id)
    } else if (idx < 0 && boosted.length < 3) {
      boosted.push(id)
    } else if (idx < 0 && boosted.length >= 3) {
      boosted.pop()
      boosted.unshift(id)
    }
  }

  return normalizeMetricPreferences(boosted)
}

export function formatMetricPreferencesBlock(preferences) {
  if (!preferences?.length) return ''
  const labels = preferences
    .map(id => METRIC_BY_ID[id]?.label)
    .filter(Boolean)
  if (!labels.length) return ''

  return `
STAT slot priority for this fund (fill STAT_1, then STAT_2, then STAT_3 in this order):
${labels.map((l, i) => `${i + 1}. ${l}`).join('\n')}

When the preferred metric is unavailable, use the next verified signal from research:
company financials → traction proxy (customers, usage, scale) → market/category context.
Never invent company-specific dollars. Label must match the value type (e.g. "Addressable market" for TAM).
`
}

export function getStatEditInsight(editLog, trackingId) {
  const boosts = inferMetricBoostsFromEdits(editLog, trackingId)
  if (!boosts.length) return null

  const statEdits = (editLog || []).filter(
    e => (e.trackingId ?? e.fundName) === trackingId && e.fieldName?.startsWith('STAT_'),
  )
  if (statEdits.length < 2) return null

  const top = boosts[0]
  const label = METRIC_BY_ID[top.id]?.label || top.id
  return {
    editCount: statEdits.length,
    topMetric: top.id,
    topLabel: label,
    message: `Your team edits market stats often — prioritizing "${label}" on briefs.`,
  }
}
