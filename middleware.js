import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isClerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY?.trim() &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
)

const isPublicRoute = createRouteMatcher([
  '/',
  '/brief(.*)',
  '/memo(.*)',
  '/library(.*)',
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
])

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export default function middleware(req, event) {
  if (!isClerkConfigured) {
    return NextResponse.next()
  }
  try {
    return clerkHandler(req, event)
  } catch (err) {
    console.error('[middleware]', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
