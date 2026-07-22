import { runScoutSweep } from '@/lib/server/scout-sweep'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Scout sweep cron — Perplexity candidate feed for mandate watches.
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runScoutSweep()
  return Response.json({ ...result, at: new Date().toISOString() })
}
