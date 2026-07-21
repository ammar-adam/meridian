import { GUEST_FUND_API_CONTEXT, DEFAULT_THESIS_INSTRUCTIONS } from '@/lib/fund-defaults'
import { normalizeMetricPreferences } from '@/lib/metric-preferences'
import { normalizeMemoTemplateId } from '@/lib/memo-template'

export { DEFAULT_THESIS_INSTRUCTIONS } from '@/lib/fund-defaults'

const LEGACY_PROFILE_KEY = 'meridian_fund_profile'
const FUNDS_STORE_KEY = 'meridian_funds_store'

export function slugify(name) {
  return (name || 'fund')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || 'fund'
}

export function normalizePortfolio(portfolio) {
  if (!portfolio) return []
  if (Array.isArray(portfolio)) return portfolio
  const flat = []
  for (const companies of Object.values(portfolio)) {
    if (Array.isArray(companies)) flat.push(...companies)
  }
  return flat
}

export function createStrategy(draft = {}) {
  const name = draft.name?.trim() || 'Primary'
  return {
    id: draft.id || slugify(name),
    name,
    thesis: draft.thesis?.trim() || '',
    portfolio: normalizePortfolio(draft.portfolio),
    mandate: {
      stages: draft.mandate?.stages || [],
      geographies: draft.mandate?.geographies || [],
      sectors: draft.mandate?.sectors || [],
    },
    metricPreferences: normalizeMetricPreferences(draft.metricPreferences),
  }
}

export function createFundProfile(draft = {}) {
  const fundName = draft.fundName?.trim() || 'My Fund'
  const now = new Date().toISOString()
  const fundId = draft.id || slugify(fundName)

  let strategies = draft.strategies?.length
    ? draft.strategies.map(s => createStrategy(s))
    : []

  if (!strategies.length && draft.thesis?.trim()) {
    strategies = [createStrategy({
      id: 'primary',
      name: 'Primary',
      thesis: draft.thesis,
      portfolio: draft.portfolio,
      mandate: draft.mandate,
    })]
  }

  if (!strategies.length) {
    strategies = [createStrategy({ id: 'primary', name: 'Primary' })]
  }

  const activeStrategyId = draft.activeStrategyId && strategies.some(s => s.id === draft.activeStrategyId)
    ? draft.activeStrategyId
    : strategies[0].id

  const active = strategies.find(s => s.id === activeStrategyId) || strategies[0]

  return {
    id: fundId,
    fundName,
    fundLogoUrl: draft.fundLogoUrl || '',
    fundWebsiteUrl: draft.fundWebsiteUrl || '',
    portfolio: normalizePortfolio(draft.portfolio),
    strategies,
    activeStrategyId: active.id,
    thesis: active.thesis,
    mandate: active.mandate,
    thesisInstructions: draft.thesisInstructions?.trim() || DEFAULT_THESIS_INSTRUCTIONS,
    outreachTone: draft.outreachTone?.trim() || '',
    memoTemplateId: normalizeMemoTemplateId(draft.memoTemplateId),
    createdAt: draft.createdAt || now,
    updatedAt: now,
  }
}

function readStore() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(FUNDS_STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }

  try {
    const legacy = localStorage.getItem(LEGACY_PROFILE_KEY)
    if (legacy) {
      const fund = createFundProfile(JSON.parse(legacy))
      const store = { activeFundId: fund.id, funds: [fund] }
      localStorage.setItem(FUNDS_STORE_KEY, JSON.stringify(store))
      localStorage.removeItem(LEGACY_PROFILE_KEY)
      return store
    }
  } catch { /* ignore */ }

  return null
}

function writeStore(store) {
  localStorage.setItem(FUNDS_STORE_KEY, JSON.stringify(store))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('meridian-context-change'))
    window.dispatchEvent(new Event('meridian-sync-needed'))
  }
}

export function getAllFunds() {
  const store = readStore()
  return store?.funds?.map(f => createFundProfile(f)) ?? []
}

export function getActiveFundId() {
  return readStore()?.activeFundId ?? null
}

export function setActiveFundId(fundId) {
  const store = readStore()
  if (!store?.funds?.some(f => f.id === fundId)) return null
  store.activeFundId = fundId
  writeStore(store)
  return getFundProfile()
}

export function getFundProfile(fundId) {
  const store = readStore()
  if (!store?.funds?.length) return null
  const id = fundId || store.activeFundId
  if (!id) return null
  const raw = store.funds.find(f => f.id === id)
  return raw ? createFundProfile(raw) : null
}

export function getActiveStrategy(fund) {
  if (!fund?.strategies?.length) return null
  return fund.strategies.find(s => s.id === fund.activeStrategyId) || fund.strategies[0]
}

export function setActiveStrategyId(strategyId, fundId) {
  const store = readStore()
  if (!store) return null
  const id = fundId || store.activeFundId
  const idx = store.funds.findIndex(f => f.id === id)
  if (idx < 0) return null
  const fund = createFundProfile(store.funds[idx])
  if (!fund.strategies.some(s => s.id === strategyId)) return null
  fund.activeStrategyId = strategyId
  const active = getActiveStrategy(fund)
  fund.thesis = active.thesis
  fund.mandate = active.mandate
  fund.updatedAt = new Date().toISOString()
  store.funds[idx] = fund
  writeStore(store)
  return fund
}

export function saveFundProfile(profile) {
  const normalized = createFundProfile({ ...profile, updatedAt: new Date().toISOString() })
  const active = getActiveStrategy(normalized)
  if (active) {
    normalized.thesis = active.thesis
    normalized.mandate = active.mandate
  }

  let store = readStore()
  if (!store) {
    store = { activeFundId: normalized.id, funds: [normalized] }
  } else {
    const idx = store.funds.findIndex(f => f.id === normalized.id)
    if (idx >= 0) store.funds[idx] = normalized
    else store.funds.push(normalized)
    store.activeFundId = normalized.id
  }
  writeStore(store)
  return normalized
}

export function addFund(draft, { activate = true } = {}) {
  const fund = createFundProfile(draft)
  let store = readStore()
  if (!store) store = { activeFundId: null, funds: [] }
  if (!store.funds.some(f => f.id === fund.id)) store.funds.push(fund)
  if (activate) store.activeFundId = fund.id
  writeStore(store)
  return fund
}

export function hasFundProfile() {
  const f = getFundProfile()
  if (!f?.fundName) return false
  const s = getActiveStrategy(f)
  return Boolean(s?.thesis?.trim())
}

/** If funds exist but none is active, activate the first (or last-used id if still present). */
export function ensureActiveFund() {
  const store = readStore()
  if (!store?.funds?.length) return null
  if (store.activeFundId && store.funds.some(f => f.id === store.activeFundId)) {
    return getFundProfile()
  }
  store.activeFundId = store.funds[0].id
  writeStore(store)
  return getFundProfile()
}

export function getTrackingId(fund, strategy) {
  const f = fund?.id || 'fund'
  const s = strategy?.id || fund?.activeStrategyId || 'primary'
  return `${f}:${s}`
}

export function portfolioForStrategy(fund, strategy) {
  const stratPortfolio = normalizePortfolio(strategy?.portfolio)
  if (stratPortfolio.length) return stratPortfolio
  return normalizePortfolio(fund?.portfolio)
}

export function portfolioSummary(profile, strategy) {
  const companies = portfolioForStrategy(profile, strategy || getActiveStrategy(profile))
  return companies.map(c => `${c.name} (${c.description || c.domain || ''})`).join(', ')
}

export function getFundTerms(profile, strategy) {
  const terms = new Set()
  if (profile?.fundName) terms.add(profile.fundName)
  const companies = portfolioForStrategy(profile, strategy || getActiveStrategy(profile))
  for (const c of companies) {
    if (c.name) terms.add(c.name)
    if (c.domain) terms.add(c.domain.replace(/^www\./, '').split('.')[0])
  }
  return [...terms].filter(t => t.length > 2)
}

/** API + pipeline context for the active (or given) strategy */
export function toApiFundContext(profile, strategy) {
  if (!profile) return null
  const strat = strategy || getActiveStrategy(profile)
  if (!strat) return null

  const portfolio = portfolioForStrategy(profile, strat)
  const mandate = strat.mandate?.stages?.length || strat.mandate?.sectors?.length
    ? strat.mandate
    : profile.mandate || strat.mandate

  return {
    id: profile.id,
    fundName: profile.fundName,
    fundFooterName: `${profile.fundName}${strat.name !== 'Primary' ? ` · ${strat.name}` : ''}`,
    fundLogoUrl: profile.fundLogoUrl,
    strategyId: strat.id,
    strategyName: strat.name,
    trackingId: getTrackingId(profile, strat),
    thesis: strat.thesis,
    portfolio,
    mandate: mandate || { stages: [], geographies: [], sectors: [] },
    thesisInstructions: profile.thesisInstructions,
    outreachTone: profile.outreachTone || '',
    memoTemplateId: normalizeMemoTemplateId(profile.memoTemplateId),
    metricPreferences: normalizeMetricPreferences(strat.metricPreferences),
  }
}

/** Profile if configured, otherwise guest context so brief works immediately */
export function resolveApiFundContext(profile, strategy) {
  const p = profile ?? getFundProfile()
  if (p) {
    const ctx = toApiFundContext(p, strategy ?? getActiveStrategy(p))
    if (ctx) return ctx
  }
  return { ...GUEST_FUND_API_CONTEXT }
}
