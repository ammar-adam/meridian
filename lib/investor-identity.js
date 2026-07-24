/**
 * Staging identity — who is using Meridian (fund / FO / angel / company).
 * Demo seeds (Panache/Sagard) are not a claimed user identity.
 */

export const USER_FUND_CLAIMED_KEY = 'meridian_user_fund_claimed'

export const INVESTOR_TYPES = [
  { id: 'venture_fund', label: 'Venture fund', short: 'Fund' },
  { id: 'family_office', label: 'Family office', short: 'Family office' },
  { id: 'angel', label: 'Angel investor', short: 'Angel' },
  { id: 'company', label: 'Company / CVC', short: 'Company' },
]

export const DEMO_FUND_IDS = new Set(['panache_ventures', 'sagard_ai_fund'])

export function isDemoFundId(id) {
  return DEMO_FUND_IDS.has(String(id || ''))
}

export function hasClaimedUserFund() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(USER_FUND_CLAIMED_KEY) === '1'
}

export function markUserFundClaimed() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(USER_FUND_CLAIMED_KEY, '1')
}

export function clearUserFundClaimed() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(USER_FUND_CLAIMED_KEY)
}

export function investorTypeLabel(typeId) {
  return INVESTOR_TYPES.find(t => t.id === typeId)?.label || 'Investor'
}

/** Build a usable mandate thesis from the staging identity form. */
export function buildIdentityThesis({ typeId, name, focus, geography }) {
  const type = investorTypeLabel(typeId)
  const who = (name || '').trim() || type
  const focusText = (focus || '').trim()
  const geo = (geography || '').trim()
  const parts = [
    `${who} (${type}) invests in: ${focusText}.`,
    geo ? `Geography focus: ${geo}.` : '',
    'Prefer early companies from university ecosystems with dated, sourceable proof.',
  ]
  return parts.filter(Boolean).join(' ')
}
