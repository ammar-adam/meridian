/**
 * Flow feed quality — which rows are actionable for Brief vs thin placeholders.
 */

export function hasBriefableDomain(company) {
  const raw = (company?.domain || company?.url || '').trim()
  if (!raw) return false
  const host = raw.replace(/^https?:\/\//, '').split('/')[0]
  return host.includes('.')
}

export function hasIdentifiedFounder(company) {
  if (company?.personName?.trim()) return true
  if (Array.isArray(company?.founders) && company.founders.length) return true
  return false
}

/** Row belongs in the default Flow feed (domain or named founder). */
export function isFlowReady(company) {
  return hasBriefableDomain(company) || hasIdentifiedFounder(company)
}

/** Brief can start — domain required for autogen; founder-only gets add-domain path. */
export function canAutogenBrief(company) {
  return hasBriefableDomain(company)
}

/** @returns {{ companies: object[], hiddenCount: number }} */
export function filterFlowFeed(companies = []) {
  const kept = []
  let hiddenCount = 0
  for (const c of companies) {
    if (isFlowReady(c)) kept.push(c)
    else hiddenCount += 1
  }
  return { companies: kept, hiddenCount }
}

/** Demo default — domain required for one-click Brief autogen. */
export function filterBriefableOnly(companies = []) {
  const kept = []
  let hiddenCount = 0
  for (const c of companies) {
    if (canAutogenBrief(c)) kept.push(c)
    else hiddenCount += 1
  }
  return { companies: kept, hiddenCount, briefReadyCount: kept.length }
}

export function countBriefable(companies = []) {
  return companies.filter(canAutogenBrief).length
}
