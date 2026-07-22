/**
 * Health payload shaping — the public, unauthenticated /api/health response
 * must never leak config detail (key presence, ping errors, auth mode,
 * index-provider flags). Only `ok` + user-facing feature booleans go out;
 * everything else requires the CRON_SECRET bearer token.
 *
 * Pure functions so redaction is unit-testable without request mocks.
 */

/** True only when the Authorization header is exactly `Bearer <secret>`. */
export function isCronAuthorized(authHeader, secret) {
  const s = typeof secret === 'string' ? secret.trim() : ''
  if (!s) return false
  return authHeader === `Bearer ${s}`
}

/** Strip a full (operator-level) health payload down to the public shape. */
export function shapePublicHealth(full) {
  return {
    ok: full?.ok === true,
    features: { ...(full?.features || {}) },
  }
}
