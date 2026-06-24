'use client'

import { useAuth } from '@clerk/nextjs'

export default function DeviceOnlyNotice({ className = '' }) {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  if (!clerkEnabled) {
    return (
      <p className={`text-[11px] ${className}`} style={{ color: 'var(--m-muted)' }}>
        Data saved in this browser only. Add Clerk + Postgres for team sync.
      </p>
    )
  }

  return <SignedInNotice className={className} />
}

function SignedInNotice({ className }) {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null

  if (isSignedIn) {
    return (
      <p className={`text-[11px] ${className}`} style={{ color: 'var(--m-muted)' }}>
        Signed in — briefs, signals, and fund profile sync to your account.
      </p>
    )
  }

  return (
    <p className={`text-[11px] ${className}`} style={{ color: 'var(--m-muted)' }}>
      <a href="/sign-in" className="font-medium underline">Sign in</a> to sync pursue/pass signals and fund profile across devices.
    </p>
  )
}
