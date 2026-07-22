import { buildFlowFeed } from '@/lib/server/flow-feed'
import { listAllWatches, isRecordsEnabled } from '@/lib/server/company-records'
import { dispatchWatchWebhooks } from '@/lib/server/watch-webhooks'
import { SAGARD_AI_FUND, PANACHE_VENTURES } from '@/lib/fund-seeds'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

function defaultWatches() {
  const raw = process.env.DIGEST_WATCHES?.trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch { /* fall through */ }
  }
  return [
    { fundName: PANACHE_VENTURES.fundName, thesis: PANACHE_VENTURES.thesis, id: PANACHE_VENTURES.id },
    { fundName: SAGARD_AI_FUND.fundName, thesis: SAGARD_AI_FUND.thesis, id: SAGARD_AI_FUND.id },
  ]
}

/**
 * Cron: evaluate all mandate watches, detect events, dispatch webhooks.
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

  const watches = isRecordsEnabled()
    ? (await listAllWatches({ limit: 50 })).map(w => ({
      fundName: w.fund_name || w.fund_id,
      thesis: w.thesis,
      id: w.fund_id,
      sinceIso: w.last_digest_at,
    }))
    : defaultWatches()

  const results = []
  let totalEvents = 0
  let totalDispatched = 0

  for (const watch of watches) {
    const fundContext = {
      id: watch.id || 'watch',
      fundName: watch.fundName,
      thesis: watch.thesis,
      mandate: watch.mandate || { geographies: ['Canada'], stages: ['pre-seed', 'seed'] },
    }

    const feed = await buildFlowFeed({
      thesis: watch.thesis,
      fundContext,
      sinceIso: watch.sinceIso || null,
      dispatchWebhooks: true,
    })

    const events = feed.watchEvents || []
    totalEvents += events.length
    totalDispatched += feed.meta?.webhooks?.dispatched || 0

    results.push({
      fundName: watch.fundName,
      eventCount: events.length,
      events: events.slice(0, 10),
      feedStats: feed.meta?.feedStats,
      webhooks: feed.meta?.webhooks,
    })
  }

  return Response.json({
    ok: true,
    watches: results.length,
    totalEvents,
    totalDispatched,
    results,
    at: new Date().toISOString(),
  })
}
