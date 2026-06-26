import { NextResponse } from 'next/server'

const COOKIE = 'meridian_did'
const MAX_AGE = 365 * 24 * 60 * 60

export function ensureDeviceCookie(req, response) {
  if (req.cookies.get(COOKIE)?.value) return response

  const res = response ?? NextResponse.next()
  res.cookies.set(COOKIE, globalThis.crypto.randomUUID(), {
    maxAge: MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
