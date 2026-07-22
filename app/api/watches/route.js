import { resolveActorId } from '@/lib/actor-id'
import { enforceRateLimit } from '@/lib/api-guard'
import {
  isRecordsEnabled,
  upsertWatchServer,
  listWatchesServer,
  deleteWatchServer,
} from '@/lib/server/company-records'

export const maxDuration = 15

/** Server-side mandate watches — durable across devices (Slice A task 6). */
export async function GET(req) {
  if (!isRecordsEnabled()) return Response.json({ enabled: false, watches: [] })
  const actorId = await resolveActorId(req)
  const watches = await listWatchesServer(actorId)
  return Response.json({
    enabled: true,
    watches: watches.map(w => ({
      fundId: w.fund_id,
      fundName: w.fund_name,
      thesis: w.thesis,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      lastDigestAt: w.last_digest_at,
    })),
  })
}

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'outcomes')
  if (limited) return limited
  if (!isRecordsEnabled()) return Response.json({ enabled: false }, { status: 503 })

  const actorId = await resolveActorId(req)
  const { fundId, fundName, thesis } = await req.json()
  if (!fundId?.trim() || !thesis?.trim()) {
    return Response.json({ error: 'fundId and thesis are required' }, { status: 400 })
  }
  const id = await upsertWatchServer({
    actorId,
    fundId: String(fundId).slice(0, 120),
    fundName: String(fundName || '').slice(0, 160) || null,
    thesis: String(thesis).slice(0, 2000),
  })
  if (!id) return Response.json({ error: 'Could not save watch' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req) {
  if (!isRecordsEnabled()) return Response.json({ enabled: false }, { status: 503 })
  const actorId = await resolveActorId(req)
  const { searchParams } = new URL(req.url)
  const fundId = searchParams.get('fundId')
  if (!fundId) return Response.json({ error: 'fundId is required' }, { status: 400 })
  await deleteWatchServer(actorId, fundId)
  return Response.json({ ok: true })
}
