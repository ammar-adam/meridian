'use client'

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export default function AuthBar({ variant = 'default' }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null

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
