import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { rateLimitDb, isRateLimitDbEnabled } from '@/lib/rate-limit-db'

export function getClientIp(req) {
  if (!req?.headers?.get) return 'local'
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  )
}

export async function enforceRateLimit(req, type) {
  const config = RATE_LIMITS[type]
  if (!config) return null

  const ip = getClientIp(req)
  const key = `${type}:${ip}`

  let result = null
  if (isRateLimitDbEnabled()) {
    try {
      result = await rateLimitDb(key, config)
    } catch (err) {
      console.error('[rate-limit-db]', err.message)
    }
  }

  if (!result) {
    result = rateLimit(key, config)
  }

  if (result.allowed) return null

  const minutes = Math.max(1, Math.ceil(result.retryAfterMs / 60_000))
  return Response.json(
    { error: `Rate limit reached (${config.limit}/hour). Try again in ~${minutes} min.` },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) },
    }
  )
}
