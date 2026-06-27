'use client'

import { Suspense } from 'react'
import WorkspaceShell from '@/components/workspace-shell'
import GenerateWorkspace from '@/components/generate-workspace'
import PageLoader from '@/components/page-loader'

export default function BriefPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <WorkspaceShell title="Brief" subtitle="Auto ~25–75s · Deep ~5 min · or batch on Lists">
        <GenerateWorkspace />
      </WorkspaceShell>
    </Suspense>
  )
}
