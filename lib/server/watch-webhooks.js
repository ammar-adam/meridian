/**
 * Watch webhooks v1 — POST JSON payloads on watch events.
 */

import { createHash } from 'node:crypto'
import {
  isRecordsEnabled,
  listWebhooksForActor,
  upsertWebhook,
  deleteWebhook,
} from '@/lib/server/company-records'

import { WEBHOOK_EVENT_TYPES } from '@/lib/watch-webhooks-shared'

function webhookId(actorId, url) {
  return createHash('sha1').update(`${actorId}:${url}`).digest('hex').slice(0, 24)
}

export async function registerWebhook({ actorId, url, events = WEBHOOK_EVENT_TYPES } = {}) {
  if (!isRecordsEnabled() || !actorId || !url?.trim()) return null
  const cleanUrl = url.trim()
  if (!/^https?:\/\//i.test(cleanUrl)) return null
  const allowed = (events || []).filter(e => WEBHOOK_EVENT_TYPES.includes(e))
  return upsertWebhook({
    id: webhookId(actorId, cleanUrl),
    actorId,
    url: cleanUrl,
    events: allowed.length ? allowed : WEBHOOK_EVENT_TYPES,
  })
}

export async function removeWebhook(actorId, url) {
  if (!actorId || !url) return false
  return deleteWebhook(actorId, webhookId(actorId, url.trim()))
}

export async function listWebhooks(actorId) {
  if (!actorId) return []
  return listWebhooksForActor(actorId)
}

/**
 * Dispatch events to registered webhooks (best-effort, non-blocking failures).
 */
export async function dispatchWatchWebhooks(events = [], { actorId = null, fundName = '', thesis = '' } = {}) {
  if (!isRecordsEnabled() || !events.length) {
    return { dispatched: 0, skipped: true }
  }

  const hooks = actorId
    ? await listWebhooksForActor(actorId)
    : await listAllWebhooks()

  if (!hooks.length) return { dispatched: 0, hooks: 0 }

  const payload = {
    version: 1,
    at: new Date().toISOString(),
    fundName: fundName || null,
    thesis: thesis || null,
    events,
  }

  let dispatched = 0
  const errors = []

  for (const hook of hooks) {
    const allowed = new Set(hook.events || WEBHOOK_EVENT_TYPES)
    const filtered = events.filter(e => allowed.has(e.type))
    if (!filtered.length) continue

    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Meridian-Watch-Webhook/1',
        },
        body: JSON.stringify({ ...payload, events: filtered }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) dispatched += 1
      else errors.push({ url: hook.url, status: res.status })
    } catch (e) {
      errors.push({ url: hook.url, error: e.message })
    }
  }

  return { dispatched, hooks: hooks.length, errors: errors.slice(0, 5) }
}

async function listAllWebhooks() {
  const { listAllWebhooksServer } = await import('@/lib/server/company-records')
  return listAllWebhooksServer()
}
