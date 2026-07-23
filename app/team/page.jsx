'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import { getTeamContext, setTeamContext, clearTeamContext } from '@/lib/team-workspace'

export default function TeamPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const [ctx, setCtx] = useState(null)
  const [name, setName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [shares, setShares] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const c = getTeamContext()
    setCtx(c)
    if (c?.teamId) loadShares(c.teamId)
  }, [])

  async function loadShares(teamId) {
    const res = await fetch(`/api/share?teamId=${encodeURIComponent(teamId)}`)
    if (res.status === 401 || res.status === 403) {
      setError(res.status === 401 ? 'Sign in to view team shares.' : 'You are not a member of this team.')
      setShares([])
      return
    }
    if (res.ok) {
      const data = await res.json()
      setShares(data.shares || [])
    }
  }

  async function createTeam(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, memberName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const next = { teamId: data.teamId, name: data.name, inviteCode: data.inviteCode, memberName }
      setTeamContext(next)
      setCtx(next)
      setShares([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function joinTeam(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', inviteCode, memberName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      const next = { teamId: data.teamId, name: data.name, inviteCode: data.inviteCode, memberName }
      setTeamContext(next)
      setCtx(next)
      await loadShares(data.teamId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function leaveTeam() {
    clearTeamContext()
    setCtx(null)
    setShares([])
  }

  return (
    <WorkspaceShell title="Team" subtitle="Shared brief links for your fund">
      <WorkspacePage width="narrow">
        {!clerkEnabled ? (
          <div className="m-card m-card-pad">
            <p className="text-[14px] font-medium">Cloud teams require Clerk + Postgres</p>
            <p className="mt-2 text-[13px]" style={{ color: 'var(--m-muted)' }}>
              Add <code className="text-[12px]">DATABASE_URL</code> and Clerk keys to <code className="text-[12px]">.env.local</code>, then run <code className="text-[12px]">npm run db:push</code>.
            </p>
          </div>
        ) : (
          <>
        <SignedOut>
          <div className="m-card m-card-pad mb-6 text-center">
            <p className="text-[14px] font-medium">Sign in to create or join a team</p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>
              Teams share durable brief links across your fund. Requires Clerk + Postgres.
            </p>
            <SignInButton mode="modal">
              <button type="button" className="m-btn-primary mt-4">Sign in</button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
        {ctx ? (
          <>
            <WorkspaceSection title={ctx.name} description={`Invite code: ${ctx.inviteCode}`}>
              <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>
                Share links from memos appear here for the whole team. Links expire after 30 days.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => loadShares(ctx.teamId)} className="m-btn-secondary m-btn-sm">
                  Refresh
                </button>
                <button type="button" onClick={leaveTeam} className="m-btn-ghost m-btn-sm">
                  Leave team
                </button>
              </div>
            </WorkspaceSection>

            {shares.length > 0 ? (
              <WorkspaceSection title="Team shares" bare>
                <div className="m-table-wrap">
                  <table className="m-table !min-w-0">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>GP review</th>
                        <th>Shared</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {shares.map(s => (
                        <tr key={s.id}>
                          <td className="font-medium">{s.companyName}</td>
                          <td className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
                            {s.outcome
                              ? `${s.outcome}${s.reviewerName ? ` · ${s.reviewerName}` : ''}`
                              : <span className="text-amber-300">Pending review</span>}
                          </td>
                          <td className="text-[12px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{s.createdAt?.slice(0, 10)}</td>
                          <td>
                            <Link href={`/share/${s.id}`} className="m-btn-secondary m-btn-sm" target="_blank">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WorkspaceSection>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>
                No team shares yet. Create a share link from any memo after review.
              </p>
            )}
          </>
        ) : (
          <>
            <WorkspaceSection title="Create team" description="One workspace for shared brief links">
              <form onSubmit={createTeam} className="space-y-3">
                <input className="m-input" placeholder="Fund / team name" value={name} onChange={e => setName(e.target.value)} required />
                <input className="m-input" placeholder="Your name" value={memberName} onChange={e => setMemberName(e.target.value)} />
                <button type="submit" disabled={loading} className="m-btn-primary">Create team</button>
              </form>
            </WorkspaceSection>

            <WorkspaceSection title="Join with invite code">
              <form onSubmit={joinTeam} className="space-y-3">
                <input className="m-input font-mono" placeholder="Invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required />
                <input className="m-input" placeholder="Your name" value={memberName} onChange={e => setMemberName(e.target.value)} />
                <button type="submit" disabled={loading} className="m-btn-secondary">Join team</button>
              </form>
            </WorkspaceSection>
          </>
        )}

        {error && <p className="m-alert-error mt-4">{error}</p>}
        </SignedIn>
          </>
        )}

        <p className="mt-6 text-[12px]" style={{ color: 'var(--m-muted)' }}>
          <Link href="/brief" className="hover:underline">← Back to brief</Link>
        </p>
      </WorkspacePage>
    </WorkspaceShell>
  )
}
