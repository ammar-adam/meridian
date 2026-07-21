import { enforceRateLimit } from '@/lib/api-guard'
import { buildIncubatorFastDiscover } from '@/lib/discover-fast'
import { buildFlowDigest } from '@/lib/flow-digest'
import { cohortAgeDays } from '@/lib/mandate-watch'

export const maxDuration = 30

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

function annotateForDigest(companies) {
  return (companies || []).map((c) => {
    const age = cohortAgeDays(c)
    const isFresh = age != null && age <= 120
    const community = c.coverage?.status === 'community_first' || c.notInHarmonicLikely
    return {
      ...c,
      isFresh,
      isNew: Boolean(isFresh || community),
      flowBadge: isFresh ? 'fresh' : null,
    }
  }).sort((a, b) => {
    const score = (c) => (c.isNew ? 300 : 0) + (c.isFresh ? 100 : 0) + (c.fitScore || 0)
    return score(b) - score(a)
  })
}

/**
 * Build (and optionally Slack-post) a Monday-style deal-flow digest.
 * Body: { thesis, fundContext, companies?, postSlack? }
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const body = await req.json()
  const fundContext = body.fundContext || {}
  const thesis = (body.thesis || fundContext.thesis || '').trim()
  const fundName = fundContext.fundName || body.fundName || 'Fund'

  if (!fundName || fundName === 'Your Fund') {
    return Response.json({ error: 'Choose a real fund for digest' }, { status: 400 })
  }

  let companies = Array.isArray(body.companies) ? body.companies : null
  let meta = null
  if (!companies) {
    if (!thesis) {
      return Response.json({ error: 'thesis or companies required' }, { status: 400 })
    }
    const payload = buildIncubatorFastDiscover(thesis, fundContext)
    companies = payload.companies
    meta = payload.meta
  }

  const annotated = annotateForDigest(companies)
  const digest = buildFlowDigest({ fundName, thesis, companies: annotated })

  let slack = { sent: false, reason: 'not requested' }
  if (body.postSlack) {
    slack = await postSlack(digest.text)
  }

  return Response.json({
    digest,
    meta: {
      ...meta,
      companyCount: annotated.length,
    },
    slack,
  })
}
