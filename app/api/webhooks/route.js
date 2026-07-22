import { resolveActorId } from '@/lib/actor-id'
import { enforceRateLimit } from '@/lib/api-guard'
import {
  registerWebhook,
  removeWebhook,
  listWebhooks,
  WEBHOOK_EVENT_TYPES,
} from '@/lib/server/watch-webhooks'
import { isRecordsEnabled } from '@/lib/server/company-records'

export const maxDuration = 15

/** List registered watch webhooks for the current actor. */
export async function GET(req) {
  if (!isRecordsEnabled()) {
    return Response.json({ enabled: false, webhooks: [], eventTypes: WEBHOOK_EVENT_TYPES })
  }
  const actorId = await resolveActorId(req)
  const webhooks = await listWebhooks(actorId)
  return Response.json({ enabled: true, webhooks, eventTypes: WEBHOOK_EVENT_TYPES })
}

/** Register a webhook URL for watch events. Body: { url, events? } */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'outcomes')
  if (limited) return limited
  if (!isRecordsEnabled()) {
    return Response.json({ enabled: false, error: 'Database not configured' }, { status: 503 })
  }

  const actorId = await resolveActorId(req)
  const { url, events } = await req.json()
  if (!url?.trim()) {
    return Response.json({ error: 'url is required (https://...)' }, { status: 400 })
  }

  const id = await registerWebhook({ actorId, url, events })
  if (!id) {
    return Response.json({ error: 'Could not register webhook — check URL' }, { status: 400 })
  }
  return Response.json({ ok: true, id })
}

/** Remove a webhook. Query: ?url=... */
export async function DELETE(req) {
  if (!isRecordsEnabled()) {
    return Response.json({ enabled: false }, { status: 503 })
  }
  const actorId = await resolveActorId(req)
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return Response.json({ error: 'url query param required' }, { status: 400 })
  await removeWebhook(actorId, url)
  return Response.json({ ok: true })
}
