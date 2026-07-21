/**
 * Mandate watches — the paid habit.
 * Funds subscribe because Meridian keeps watching their thesis against
 * community sources and surfaces net-new companies between visits.
 */

const WATCHES_KEY = 'meridian_mandate_watches'
const SEEN_KEY = 'meridian_flow_seen'
const VISIT_KEY = 'meridian_flow_last_visit'

function companyKey(company) {
  return (company?.domain || company?.name || '').toLowerCase().trim()
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new Event('meridian-flow-change'))
}

export function listWatches() {
  const all = readJson(WATCHES_KEY, [])
  return Array.isArray(all) ? all : []
}

export function getWatchForFund(fundId) {
  if (!fundId) return null
  return listWatches().find(w => w.fundId === fundId) || null
}

/** Save or update a mandate watch for continuous deal flow. */
export function upsertWatch({ fundId, fundName, strategyId, strategyName, thesis }) {
  if (!fundId || !thesis?.trim()) return null
  const all = listWatches().filter(w => w.fundId !== fundId)
  const watch = {
    id: `watch_${fundId}`,
    fundId,
    fundName: fundName || 'Fund',
    strategyId: strategyId || 'primary',
    strategyName: strategyName || 'Primary',
    thesis: thesis.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const prev = listWatches().find(w => w.fundId === fundId)
  if (prev?.createdAt) watch.createdAt = prev.createdAt
  all.unshift(watch)
  writeJson(WATCHES_KEY, all.slice(0, 20))
  return watch
}

export function removeWatch(fundId) {
  writeJson(WATCHES_KEY, listWatches().filter(w => w.fundId !== fundId))
}

export function getSeenKeys(fundId) {
  const all = readJson(SEEN_KEY, {})
  return new Set(all[fundId] || [])
}

export function markSeen(fundId, companies) {
  if (!fundId) return
  const all = readJson(SEEN_KEY, {})
  const next = new Set(all[fundId] || [])
  for (const c of companies || []) {
    const k = companyKey(c)
    if (k) next.add(k)
  }
  all[fundId] = [...next]
  writeJson(SEEN_KEY, all)
  writeJson(VISIT_KEY, {
    ...readJson(VISIT_KEY, {}),
    [fundId]: new Date().toISOString(),
  })
}

export function getLastVisit(fundId) {
  const all = readJson(VISIT_KEY, {})
  return all[fundId] || null
}

/** Days since cohort date — used when seed set hasn't grown yet. Safe on server. */
export function cohortAgeDays(company) {
  const raw = company?.cohortDate || company?.sourceMeta?.cohortDate
  if (!raw) return null
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24))
}

/**
 * Annotate companies with isNew / isFresh for the Flow feed.
 * isNew: not in lastSeen snapshot (true net-new after first visit)
 * isFresh: cohort within 120 days (recent community signal even on first visit)
 */
export function annotateFlowCompanies(companies, { fundId, firstVisit = false } = {}) {
  const seen = getSeenKeys(fundId)
  const hasHistory = seen.size > 0

  return (companies || []).map((c) => {
    const key = companyKey(c)
    const age = cohortAgeDays(c)
    const isFresh = age != null && age <= 120
    const isNew = hasHistory ? Boolean(key && !seen.has(key)) : false
    return {
      ...c,
      cohortDate: c.cohortDate || c.sourceMeta?.cohortDate || null,
      isNew,
      isFresh,
      flowBadge: isNew ? 'new' : isFresh ? 'fresh' : null,
    }
  })
}

export function sortFlowCompanies(companies) {
  return [...(companies || [])].sort((a, b) => {
    const score = (c) => (c.isNew ? 300 : 0) + (c.isFresh ? 100 : 0) + (c.fitScore || 0)
    const d = score(b) - score(a)
    if (d !== 0) return d
    const ad = Date.parse(a.cohortDate || '') || 0
    const bd = Date.parse(b.cohortDate || '') || 0
    return bd - ad
  })
}

export function flowSummary(companies) {
  const list = companies || []
  return {
    total: list.length,
    newCount: list.filter(c => c.isNew).length,
    freshCount: list.filter(c => c.isFresh).length,
  }
}
