/**
 * Flow feed quality — which rows are actionable for Brief vs thin placeholders.
 */

import { trustTier } from '@/lib/source-trust'

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

/** Hide thin AI school-scout fluff that lacks founders + domain. */
export function isMentorReadyRow(company) {
  const source = String(company?.source || '').toLowerCase()
  const scoutish = source === 'university_scout' || source === 'scout' || company?.unverified
  if (!scoutish) return true
  // Keep scout rows only when they still look briefable/identifiable.
  if (hasBriefableDomain(company) && hasIdentifiedFounder(company)) return true
  if (hasBriefableDomain(company) && trustTier(company) >= 40) return true
  return false
}

/** @returns {{ companies: object[], hiddenCount: number }} */
export function filterFlowFeed(companies = []) {
  const kept = []
  let hiddenCount = 0
  for (const c of companies) {
    if (!isFlowReady(c) || !isMentorReadyRow(c)) {
      hiddenCount += 1
      continue
    }
    kept.push(c)
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
