import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { ensureDeviceCookie } from '@/lib/middleware-device'
import {
  isClerkConfigured,
  clerkKeysMatch,
  clerkPublishableKey,
  clerkSecretKey,
} from '@/lib/clerk-config'

const clerkReady = isClerkConfigured()
  && clerkKeysMatch(clerkPublishableKey(), clerkSecretKey())

if (isClerkConfigured() && !clerkReady) {
  console.error(
    '[middleware] Clerk keys appear mismatched (pk/sk from different apps or quoted .env values). Auth middleware disabled.',
  )
}

const isPublicRoute = createRouteMatcher([
  '/',
  '/brief(.*)',
  '/memo(.*)',
  '/library(.*)',
  '/lists(.*)',
  '/discover(.*)',
  '/flow(.*)',
  '/pilot(.*)',
  '/demo(.*)',
  '/earliness(.*)',
  '/thesis(.*)',
  '/share(.*)',
  '/claim(.*)',
  '/about(.*)',
  '/pricing(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/fund/setup(.*)',
  '/fund(.*)',
  '/api/health',
  '/api/scrape(.*)',
  '/api/research(.*)',
  '/api/generate(.*)',
  '/api/pdf(.*)',
  '/api/share(.*)',
  '/api/brief(.*)',
  '/api/research-cache(.*)',
  '/api/batch(.*)',
  '/api/source(.*)',
  '/api/flow(.*)',
  '/api/digest(.*)',
  '/api/pilot(.*)',
  '/api/founder-email(.*)',
  '/api/outcomes(.*)',
  '/api/benchmark(.*)',
  '/api/corpus(.*)',
  '/api/claim(.*)',
  '/api/watches(.*)',
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
  if (!clerkReady) {
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
