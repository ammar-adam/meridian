import { buildIncubatorFastDiscover } from '@/lib/discover-fast'
import { buildFlowDigest } from '@/lib/flow-digest'
import { SAGARD_AI_FUND, PANACHE_VENTURES } from '@/lib/fund-seeds'

export const maxDuration = 60

async function postSlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL?.trim()
  if (!url) return { sent: false, reason: 'SLACK_WEBHOOK_URL not set' }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { sent: false, reason: `slack ${res.status}: ${body.slice(0, 120)}` }
  }
  return { sent: true }
}

function defaultWatches() {
  const raw = process.env.DIGEST_WATCHES?.trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch { /* fall through */ }
  }
  return [
    {
      fundName: PANACHE_VENTURES.fundName,
      thesis: PANACHE_VENTURES.thesis,
      id: PANACHE_VENTURES.id,
    },
    {
      fundName: SAGARD_AI_FUND.fundName,
      thesis: SAGARD_AI_FUND.thesis,
      id: SAGARD_AI_FUND.id,
    },
  ]
}

/**
 * Monday deal-flow digest cron.
 * Auth: Authorization: Bearer CRON_SECRET
 * Optional: SLACK_WEBHOOK_URL, DIGEST_WATCHES (JSON array of {fundName,thesis,id})
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

  const watches = defaultWatches()
  const results = []

  for (const watch of watches) {
    const fundContext = {
      id: watch.id || 'digest',
      fundName: watch.fundName,
      thesis: watch.thesis,
      mandate: watch.mandate || { geographies: ['Canada'], stages: ['pre-seed', 'seed'] },
    }
    const payload = buildIncubatorFastDiscover(watch.thesis, fundContext)
    const companies = (payload.companies || []).map(c => ({
      ...c,
      isNew: Boolean(c.isFresh || c.coverage?.status === 'community_first'),
      isFresh: Boolean(c.isFresh),
    }))
    const digest = buildFlowDigest({
      fundName: watch.fundName,
      thesis: watch.thesis,
      companies,
    })
    const slack = await postSlack(digest.text)
    results.push({
      fundName: watch.fundName,
      stats: digest.stats,
      slack,
      subject: digest.subject,
    })
  }

  return Response.json({
    ok: true,
    digests: results.length,
    results,
    at: new Date().toISOString(),
  })
}
