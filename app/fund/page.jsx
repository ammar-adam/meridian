'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage from '@/components/workspace-page'
import FundProfileForm from '@/components/fund-profile-form'
import WatchWebhooksPanel from '@/components/watch-webhooks-panel'
import { FundSwitcher } from '@/components/context-switcher'
import { getFundProfile } from '@/lib/fund-profile'

export default function FundPage() {
  const [profile, setProfile] = useState(null)
  const [addingFund, setAddingFund] = useState(false)

  useEffect(() => { setProfile(getFundProfile()) }, [])

  function refresh() {
    setProfile(getFundProfile())
    setAddingFund(false)
    window.dispatchEvent(new Event('meridian-context-change'))
  }

  return (
    <WorkspaceShell
      title="Fund"
      subtitle="Strategies, thesis, portfolio"
      actions={<FundSwitcher onChange={refresh} />}
    >
      <WorkspacePage width="narrow">
        {!addingFund ? (
          <>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => setAddingFund(true)} className="m-btn-secondary m-btn-sm">
                + Add another fund
              </button>
            </div>
            <div className="m-card m-card-pad">
              {profile ? (
                <FundProfileForm initial={profile} onSaved={p => { setProfile(p); refresh() }} />
              ) : (
                <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>Loading…</p>
              )}
            </div>
            <WatchWebhooksPanel />
          </>
        ) : (
          <div className="m-card m-card-pad">
            <p className="mb-4 text-[13px]" style={{ color: 'var(--m-muted)' }}>
              Add a separate fund profile (e.g. another vehicle or strategy group).
            </p>
            <FundProfileForm newFund onSaved={refresh} />
            <button type="button" onClick={() => setAddingFund(false)} className="m-btn-ghost m-btn-sm mt-4">
              Cancel
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-[12px]" style={{ color: 'var(--m-muted-2)' }}>
          <Link href="/fund/setup" className="underline-offset-2 hover:underline">Re-run setup</Link>
        </p>
      </WorkspacePage>
    </WorkspaceShell>
  )
}
