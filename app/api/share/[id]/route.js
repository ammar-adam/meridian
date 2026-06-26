import { enforceRateLimit } from '@/lib/api-guard'
import { getShare } from '@/lib/share-store'

export async function GET(req, { params }) {
  const limited = await enforceRateLimit(req, 'share')
  if (limited) return limited

  const payload = await getShare(params.id)
  if (!payload) {
    return Response.json({ error: 'Share not found or expired' }, { status: 404 })
  }

  return Response.json(payload)
}
