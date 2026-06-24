import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  )
}

export function enforceRateLimit(req, type) {
  const ip = getClientIp(req)
  const config = RATE_LIMITS[type]
  if (!config) return null

  const result = rateLimit(`${type}:${ip}`, config)
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
