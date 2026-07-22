/**
 * Pure validation for /api/outcomes writes — size caps + outcome whitelist,
 * so anonymous device-bound writes can't stuff arbitrary payloads into the
 * ledger. Kept pure (no imports) so it is unit-testable without mocks.
 */

export const OUTCOME_VALUES = ['pursue', 'pass']

export const OUTCOME_LIMITS = {
  entityName: 160,
  domain: 200,
  fundName: 120,
}

function capped(value, max) {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!s) return null
  return s.slice(0, max)
}

/**
 * Returns { ok: true, value: { entityName, domain, outcome, fundName } }
 * or { ok: false, error }.
 */
export function validateOutcomePayload(body) {
  const entityName = capped(body?.entityName, OUTCOME_LIMITS.entityName)
  const outcome = typeof body?.outcome === 'string' ? body.outcome.trim() : ''

  if (!entityName || !OUTCOME_VALUES.includes(outcome)) {
    return { ok: false, error: 'entityName and outcome (pursue|pass) required' }
  }

  return {
    ok: true,
    value: {
      entityName,
      outcome,
      domain: capped(body?.domain, OUTCOME_LIMITS.domain),
      fundName: capped(body?.fundName, OUTCOME_LIMITS.fundName),
    },
  }
}
