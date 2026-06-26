import { enforceRateLimit } from '@/lib/api-guard'
import { recordShareOutcome } from '@/lib/share-store'

const VALID = new Set(['pursue', 'pass', 'more_info'])

export async function POST(req, { params }) {
  const limited = enforceRateLimit(req, 'share')
  if (limited) return limited

  const body = await req.json()
  const outcome = body.outcome === 'more_info' ? 'more_info' : body.outcome
  if (!VALID.has(outcome)) {
    return Response.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  try {
    const payload = await recordShareOutcome(params.id, {
      outcome,
      reviewerName: body.reviewerName?.trim() || null,
      note: body.note?.trim() || null,
    })
    if (!payload) {
      return Response.json({ error: 'Share not found or expired' }, { status: 404 })
    }
    return Response.json({ ok: true, meta: payload.meta })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to record outcome' }, { status: 500 })
  }
}
