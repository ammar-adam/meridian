/** Canonical public origins for Meridian staging / demos. */

// Prefer meridian-stg — "meridian-staging.vercel.app" and "meridian-demo" are taken globally.
export const DEMO_HOST = 'meridian-stg.vercel.app'
export const DEMO_LABEL = 'Meridian Staging'
export const LEGACY_HOST = 'meridian-eight-sandy.vercel.app'
export const MENTOR_HOST = 'meridian-stg.vercel.app'
export const DEMO_ORIGIN = `https://${DEMO_HOST}`
export const LEGACY_ORIGIN = `https://${LEGACY_HOST}`

/**
 * Server/client-safe public origin.
 * Prefer NEXT_PUBLIC_APP_URL, then request host, then staging host.
 */
export function getAppOrigin(req) {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  const headerHost = req?.headers?.get?.('x-forwarded-host') || req?.headers?.get?.('host')
  if (headerHost) {
    const proto = req?.headers?.get?.('x-forwarded-proto') || 'https'
    return `${proto}://${headerHost}`.replace(/\/$/, '')
  }

  const vercel = (process.env.VERCEL_URL || '').trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`

  return DEMO_ORIGIN
}

export function isDemoHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  return (
    h.includes('meridian-stg')
    || h.includes('meridianstaging')
    || h.includes('meridian-mentor')
    || h.includes('meridian-demo')
    || h.includes('meridian-eight-sandy')
    || h.includes('meridian-staging')
    || h === DEMO_HOST
    || h.includes('localhost')
  )
}
