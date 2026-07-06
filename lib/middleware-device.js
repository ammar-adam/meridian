import { NextResponse } from 'next/server'

const COOKIE = 'meridian_did'
const MAX_AGE = 365 * 24 * 60 * 60

/** Clerk middleware may return a plain Response — coerce before using .cookies */
function toNextResponse(response) {
  if (!response) return NextResponse.next()
  if (response instanceof NextResponse) return response
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export function ensureDeviceCookie(req, response) {
  if (req.cookies.get(COOKIE)?.value) {
    return response ?? NextResponse.next()
  }

  const res = toNextResponse(response)
  res.cookies.set(COOKIE, globalThis.crypto.randomUUID(), {
    maxAge: MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
