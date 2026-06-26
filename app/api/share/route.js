import { enforceRateLimit } from '@/lib/api-guard'
import { getUserId } from '@/lib/auth-server'
import { createShare, listTeamShares, isShareEnabled } from '@/lib/share-store'

export const maxDuration = 30

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'share')
  if (limited) return limited

  if (!isShareEnabled()) {
    return Response.json({ error: 'Share links require DATABASE_URL' }, { status: 503 })
  }

  const body = await req.json()
  const { memoData, meta } = body

  if (!memoData?.COMPANY_NAME) {
    return Response.json({ error: 'memoData is required' }, { status: 400 })
  }

  const userId = await getUserId()

  try {
    const id = await createShare({ memoData, meta: meta || {}, userId })
    return Response.json({ id, url: `/share/${id}` })
  } catch (err) {
    console.error('[share] create error:', err.message)
    return Response.json({ error: err.message || 'Failed to create share link' }, { status: 500 })
  }
}

export async function GET(req) {
  const limited = await enforceRateLimit(req, 'share')
  if (limited) return limited

  const teamId = new URL(req.url).searchParams.get('teamId')
  if (!teamId) {
    return Response.json({ error: 'teamId query required' }, { status: 400 })
  }

  const shares = await listTeamShares(teamId)
  return Response.json({ shares })
}
