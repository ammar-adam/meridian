'use client'

import { createContext, useContext } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import WorkspaceSync from '@/components/workspace-sync'
import GpOutcomePoller from '@/components/gp-outcome-poller'
import FundSeedHost from '@/components/fund-seed-host'

const MeridianClerkContext = createContext({ clerkEnabled: false })

export function useMeridianClerk() {
  return useContext(MeridianClerkContext)
}

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
  const active = Boolean(clerkEnabled && publishableKey)

  const inner = (
    <MeridianClerkContext.Provider value={{ clerkEnabled: active }}>
      <GpOutcomePoller />
      <FundSeedHost />
      {active ? <WorkspaceSync /> : null}
      {children}
    </MeridianClerkContext.Provider>
  )

  if (!active) return inner

  return (
    <ClerkProvider publishableKey={publishableKey} signInUrl={signInUrl} signUpUrl={signUpUrl}>
      {inner}
    </ClerkProvider>
  )
}
