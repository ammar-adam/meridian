'use client'

import { Suspense } from 'react'
import WorkspaceShell from '@/components/workspace-shell'
import GenerateWorkspace from '@/components/generate-workspace'
import PageLoader from '@/components/page-loader'

export default function BriefPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <WorkspaceShell title="Brief" subtitle="paste url → fund-native memo in ~90s">
        <GenerateWorkspace />
      </WorkspaceShell>
    </Suspense>
  )
}
