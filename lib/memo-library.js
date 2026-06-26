import { extractDomain } from '@/lib/url-utils'
import { MEMO_REUSE_MAX_AGE_MS } from '@/lib/cost-estimate'
import { notifySyncNeeded } from '@/lib/workspace-local'

const LIBRARY_KEY = 'meridian_memo_library'

export function saveMemo(memoData, id, meta = {}) {
  const library = getMemoLibrary()
  const entryId = id ?? Date.now().toString()
  const existing = library.find(e => e.id === entryId)

  const entry = {
    id: entryId,
    companyName: memoData.COMPANY_NAME,
    companyDomain: meta.companyDomain ?? existing?.companyDomain ?? null,
    round: memoData.ROUND,
    date: memoData.DATE,
    savedAt: new Date().toISOString(),
    data: memoData,
    outcome: meta.outcome ?? existing?.outcome ?? null,
    editCount: meta.editCount ?? existing?.editCount ?? 0,
    sourceThesis: meta.searchThesis ?? meta.sourceThesis ?? existing?.sourceThesis ?? null,
    fundId: meta.fundId ?? existing?.fundId ?? null,
    fundName: meta.fundName ?? existing?.fundName ?? null,
    strategyId: meta.strategyId ?? existing?.strategyId ?? null,
    strategyName: meta.strategyName ?? existing?.strategyName ?? null,
    trackingId: meta.trackingId ?? existing?.trackingId ?? null,
    qualityPassed: meta.qualityPassed ?? existing?.qualityPassed ?? null,
    qualityWarnCount: meta.qualityWarnCount ?? existing?.qualityWarnCount ?? 0,
  }

  const existingIdx = library.findIndex(e => e.id === entryId)
  if (existingIdx >= 0) {
    library[existingIdx] = entry
  } else {
    library.unshift(entry)
  }

  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library.slice(0, 200)))
  notifySyncNeeded()
  return entryId
}

export function updateMemoMeta(id, meta) {
  const library = getMemoLibrary()
  const idx = library.findIndex(e => e.id === id)
  if (idx < 0) return
  library[idx] = { ...library[idx], ...meta }
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
  notifySyncNeeded()
}

export function getMemoLibrary() {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getMemoById(id) {
  return getMemoLibrary().find(e => e.id === id) ?? null
}

/** Briefs for the same company domain (may span funds/strategies) */
export function getRelatedMemos(domain, excludeId) {
  if (!domain) return []
  const normalized = extractDomain(domain)
  return getMemoLibrary().filter(e => e.companyDomain === normalized && e.id !== excludeId)
}

/** Most recent library brief for a domain, optionally scoped to fund and max age */
export function findMemoByDomain(urlOrDomain, { fundId, maxAgeMs = MEMO_REUSE_MAX_AGE_MS } = {}) {
  const domain = extractDomain(urlOrDomain)
  if (!domain) return null

  const cutoff = maxAgeMs ? Date.now() - maxAgeMs : 0
  return getMemoLibrary().find(entry => {
    if (entry.companyDomain !== domain) return false
    if (fundId && entry.fundId && entry.fundId !== fundId) return false
    if (maxAgeMs && new Date(entry.savedAt).getTime() < cutoff) return false
    return true
  }) ?? null
}

export function filterCompaniesNeedingBrief(companies, { fundId, maxAgeMs = MEMO_REUSE_MAX_AGE_MS } = {}) {
  return companies.filter(company => {
    const url = company.url || (company.domain ? `https://${company.domain}` : '')
    return url && !findMemoByDomain(url, { fundId, maxAgeMs })
  })
}

export function filterMemosByStrategy(library, strategyId) {
  if (!strategyId || strategyId === 'all') return library
  return library.filter(e => e.strategyId === strategyId)
}
