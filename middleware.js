import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { ensureDeviceCookie } from '@/lib/middleware-device'

const isClerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY?.trim() &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
)

const isPublicRoute = createRouteMatcher([
  '/',
  '/brief(.*)',
  '/memo(.*)',
  '/library(.*)',
  '/lists(.*)',
  '/discover(.*)',
  '/thesis(.*)',
  '/share(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/fund/setup(.*)',
  '/api/health',
  '/api/scrape(.*)',
  '/api/research(.*)',
  '/api/generate(.*)',
  '/api/pdf(.*)',
  '/api/share(.*)',
  '/api/brief(.*)',
  '/api/batch(.*)',
  '/api/cron(.*)',
])

const isApiRoute = createRouteMatcher(['/api(.*)'])

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req) || isApiRoute(req)) return

  const { userId } = await auth()
  if (!userId) {
    const signIn = new URL('/sign-in', req.url)
    signIn.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signIn)
  }
})

export default function middleware(req, event) {
  if (!isClerkConfigured) {
    return ensureDeviceCookie(req, NextResponse.next())
  }
  try {
    const result = clerkHandler(req, event)
    if (result instanceof Promise) {
      return result.then(r => ensureDeviceCookie(req, r ?? NextResponse.next()))
    }
    return ensureDeviceCookie(req, result ?? NextResponse.next())
  } catch (err) {
    console.error('[middleware]', err)
    return ensureDeviceCookie(req, NextResponse.next())
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|tar|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
