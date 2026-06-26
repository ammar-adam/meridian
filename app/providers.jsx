'use client'

import { ClerkProvider } from '@clerk/nextjs'
import WorkspaceSync from '@/components/workspace-sync'
import GpOutcomePoller from '@/components/gp-outcome-poller'

export default function Providers({ children }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  const inner = (
    <>
      <GpOutcomePoller />
      {publishableKey ? <WorkspaceSync /> : null}
      {children}
    </>
  )

  if (!publishableKey) {
    return inner
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {inner}
    </ClerkProvider>
  )
}
