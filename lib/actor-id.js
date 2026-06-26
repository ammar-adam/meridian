import { getUserId } from '@/lib/auth-server'

const DEVICE_COOKIE = 'meridian_did'
const DEVICE_HEADER = 'x-meridian-device-id'
const DEVICE_RE = /^[a-zA-Z0-9_-]{8,64}$/

function cookieValue(req, name) {
  const fromNext = req?.cookies?.get?.(name)?.value
  if (fromNext) return fromNext
  const header = req?.headers?.get?.('cookie') || ''
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function normalizeDeviceId(raw) {
  if (!raw || !DEVICE_RE.test(raw)) return null
  return raw.startsWith('did_') ? raw : `did_${raw}`
}

/** Clerk user id, else per-device id, else shared guest fallback. */
export async function resolveActorId(req) {
  const clerkId = await getUserId()
  if (clerkId) return clerkId

  const fromHeader = req?.headers?.get?.(DEVICE_HEADER)?.trim()
  const fromCookie = cookieValue(req, DEVICE_COOKIE)
  const deviceId = normalizeDeviceId(fromHeader || fromCookie)
  if (deviceId) return deviceId

  return 'guest'
}
