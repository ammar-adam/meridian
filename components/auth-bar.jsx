'use client'

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { useMeridianClerk } from '@/app/providers'

export default function AuthBar({ variant = 'default' }) {
  const { clerkEnabled } = useMeridianClerk()
  // Only render Clerk UI when ClerkProvider is actually mounted — mismatched
  // keys used to crash the landing/workspace with "useAuth outside provider".
  if (!clerkEnabled) return null

  const isLanding = variant === 'landing'

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className={isLanding ? 'm-btn-ghost-landing text-[13px]' : 'm-btn-ghost m-btn-sm'}
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
      </SignedIn>
    </div>
  )
}
