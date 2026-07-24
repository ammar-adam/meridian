'use client'

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { useMeridianClerk } from '@/app/providers'

/** Staging identity when Clerk is off; Clerk modal when keys are live. */
export default function AuthBar({ variant = 'default' }) {
  const { clerkEnabled } = useMeridianClerk()
  const isLanding = variant === 'landing'
  const btnClass = isLanding ? 'm-btn-ghost-landing text-[13px]' : 'm-btn-ghost m-btn-sm'
  const welcomeHref = '/welcome?next=/flow'

  if (!clerkEnabled) {
    return (
      <a href={welcomeHref} className={btnClass}>
        Sign in
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl={welcomeHref} signUpForceRedirectUrl={welcomeHref}>
          <button type="button" className={btnClass}>
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <a href={welcomeHref} className={btnClass}>
          Your firm
        </a>
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
      </SignedIn>
    </div>
  )
}
