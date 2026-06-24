const buckets = new Map()

export const RATE_LIMITS = {
  scrape: { limit: 80, windowMs: 60 * 60 * 1000 },
  research: { limit: 25, windowMs: 60 * 60 * 1000 },
  generate: { limit: 40, windowMs: 60 * 60 * 1000 },
  source: { limit: 10, windowMs: 60 * 60 * 1000 },
  fundEnrich: { limit: 6, windowMs: 60 * 60 * 1000 },
  share: { limit: 30, windowMs: 60 * 60 * 1000 },
  team: { limit: 20, windowMs: 60 * 60 * 1000 },
  pdf: { limit: 15, windowMs: 60 * 60 * 1000 },
}

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { windowStart: now, count: 0 }
    buckets.set(key, bucket)
  }
  bucket.count++
  const allowed = bucket.count <= limit
  const retryAfterMs = allowed ? 0 : windowMs - (now - bucket.windowStart)
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterMs,
  }
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > 2 * 60 * 60 * 1000) buckets.delete(key)
    }
  }, 10 * 60 * 1000)
  timer.unref?.()
}
