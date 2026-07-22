/**
 * Pure validation for founder claims (/api/claim) — required fields, size
 * caps, and the optional structured fields (stage, raise, deck, sectors).
 * Kept pure (no imports) so it is unit-testable without request mocks.
 */

export const CLAIM_STAGES = ['pre-seed', 'seed', 'series-a', 'later']

export const CLAIM_LIMITS = {
  companyName: 120,
  founderName: 120,
  claimerEmail: 160,
  message: 2000,
  raiseAmount: 80,
  deckUrl: 400,
  sectors: 240,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const HTTP_URL_RE = /^https?:\/\/\S+\.\S+/i

function capped(value, max) {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!s) return null
  return s.slice(0, max)
}

/**
 * Returns { ok: true, value } with normalized fields, or { ok: false, error }.
 */
export function validateClaimPayload(body) {
  const companyName = capped(body?.companyName, CLAIM_LIMITS.companyName)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  if (!companyName || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Company name and a valid email are required' }
  }

  const rawStage = typeof body?.stage === 'string' ? body.stage.trim() : ''
  const stage = CLAIM_STAGES.includes(rawStage) ? rawStage : null

  let deckUrl = capped(body?.deckUrl, CLAIM_LIMITS.deckUrl)
  if (deckUrl && !HTTP_URL_RE.test(deckUrl)) {
    if (HTTP_URL_RE.test(`https://${deckUrl}`)) deckUrl = `https://${deckUrl}`
    else return { ok: false, error: 'Deck link must be a valid http(s) URL' }
  }

  return {
    ok: true,
    value: {
      companyName,
      founderName: capped(body?.founderName, CLAIM_LIMITS.founderName),
      claimerEmail: email.slice(0, CLAIM_LIMITS.claimerEmail),
      message: capped(body?.message, CLAIM_LIMITS.message),
      stage,
      raiseAmount: capped(body?.raiseAmount, CLAIM_LIMITS.raiseAmount),
      deckUrl,
      sectors: capped(body?.sectors, CLAIM_LIMITS.sectors),
    },
  }
}
