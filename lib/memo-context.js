import { extractDomain } from '@/lib/url-utils'
import { getFundProfile, getActiveStrategy, getTrackingId, toApiFundContext } from '@/lib/fund-profile'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'

export function buildMemoMeta({ url, searchThesis } = {}) {
  const fund = getFundProfile()
  if (!fund) {
    return {
      fundId: 'guest',
      fundName: GUEST_FUND_API_CONTEXT.fundName,
      trackingId: 'guest',
      searchThesis: searchThesis || null,
      companyDomain: extractDomain(url),
      companyUrl: url ? (String(url).startsWith('http') ? url : `https://${url}`) : null,
      isGuest: true,
    }
  }
  const strategy = getActiveStrategy(fund)
  const ctx = toApiFundContext(fund, strategy)
  return {
    fundId: fund.id,
    fundName: fund.fundName,
    strategyId: strategy?.id,
    strategyName: strategy?.name,
    trackingId: ctx.trackingId,
    searchThesis: searchThesis || null,
    companyDomain: extractDomain(url),
  }
}

export function readMemoMetaFromSession() {
  try {
    const raw = sessionStorage.getItem('memoMeta')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeMemoMetaToSession(meta) {
  sessionStorage.setItem('memoMeta', JSON.stringify(meta))
}
