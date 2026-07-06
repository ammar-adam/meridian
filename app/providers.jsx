'use client'

import { ClerkProvider } from '@clerk/nextjs'
import WorkspaceSync from '@/components/workspace-sync'
import GpOutcomePoller from '@/components/gp-outcome-poller'
import FundSeedHost from '@/components/fund-seed-host'

function stripEnvQuotes(value) {
  const v = (value ?? '').trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).trim()
  }
  return v
}

export default function Providers({ children, clerkEnabled = false }) {
  const publishableKey = stripEnvQuotes(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const signInUrl = stripEnvQuotes(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL) || '/sign-in'
  const signUpUrl = stripEnvQuotes(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL) || '/sign-up'

  const inner = (
    <>
      <GpOutcomePoller />
      <FundSeedHost />
      {clerkEnabled && publishableKey ? <WorkspaceSync /> : null}
      {children}
    </>
  )

  if (!clerkEnabled || !publishableKey) {
    return inner
  }

  return (
    <ClerkProvider publishableKey={publishableKey} signInUrl={signInUrl} signUpUrl={signUpUrl}>
      {inner}
    </ClerkProvider>
  )
}
