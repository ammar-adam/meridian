'use client'

import { ClerkProvider } from '@clerk/nextjs'
import WorkspaceSync from '@/components/workspace-sync'

export default function Providers({ children }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    return <>{children}</>
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <WorkspaceSync />
      {children}
    </ClerkProvider>
  )
}
