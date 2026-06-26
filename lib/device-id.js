const COOKIE = 'meridian_did'

/** Client-side device id from cookie (set by middleware). */
export function getDeviceId() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`))
  return match?.[1] || null
}

export function deviceIdHeaders() {
  const id = getDeviceId()
  return id ? { 'X-Meridian-Device-Id': id } : {}
}
