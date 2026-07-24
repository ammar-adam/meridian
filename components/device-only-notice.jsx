'use client'

import { useAuth } from '@clerk/nextjs'
import { useMeridianClerk } from '@/app/providers'

export default function DeviceOnlyNotice({ className = '' }) {
  const { clerkEnabled } = useMeridianClerk()

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
      <a href="/welcome?next=/flow" className="font-medium underline">Sign in</a> to set your firm and sync signals on this device.
    </p>
  )
}
