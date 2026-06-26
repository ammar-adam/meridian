import { isDbEnabled } from '@/lib/db'

/**
 * Increment rate bucket in Neon when available.
 */
export async function rateLimitDb(key, { limit, windowMs }) {
  if (!isDbEnabled()) return null

  const now = Date.now()
  const sql = (await import('@neondatabase/serverless')).neon(process.env.DATABASE_URL)

  const rows = await sql.query(
    'SELECT count, window_start FROM rate_buckets WHERE key = $1',
    [key]
  )
  const row = rows?.[0]

  let count = 1
  let windowStart = new Date(now)

  if (row) {
    const windowStartMs = new Date(row.window_start).getTime()
    if (now - windowStartMs < windowMs) {
      count = Number(row.count) + 1
      windowStart = new Date(windowStartMs)
    }
  }

  await sql.query(
    `INSERT INTO rate_buckets (key, count, window_start)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET count = $2, window_start = $3`,
    [key, count, windowStart.toISOString()]
  )

  const allowed = count <= limit
  const retryAfterMs = allowed
    ? 0
    : windowMs - (now - windowStart.getTime())

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterMs,
  }
}

export function isRateLimitDbEnabled() {
  return isDbEnabled()
}
