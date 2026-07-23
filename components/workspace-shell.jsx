'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getWorkspaceSnapshot } from '@/lib/workspace-snapshot'
import FundGate from '@/components/fund-gate'
import WorkflowStrip from '@/components/workflow-strip'
import WorkspaceContextBar from '@/components/workspace-context-bar'
import AuthBar from '@/components/auth-bar'
import ClerkLiveBanner from '@/components/clerk-live-banner'
import { FundSwitcher, StrategySwitcher, ActiveContextLabel } from '@/components/context-switcher'

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { href: '/flow', label: 'Deal Flow', desc: 'Community companies before indexes', primary: true },
      { href: '/discover', label: 'Discover', desc: 'Thesis → ranked companies' },
      { href: '/brief', label: 'Brief', desc: 'URL → memo' },
      { href: '/library', label: 'Library', desc: 'Saved briefs', badgeKey: 'pendingReview' },
      { href: '/thesis', label: 'Thesis', desc: 'Pursue/pass signals', badgeKey: 'reviewedCount' },
    ],
  },
  {
    label: 'More',
    items: [
      { href: '/demo', label: 'Demo checklist', desc: 'Preflight before you record' },
      { href: '/pilot', label: 'Coverage proof', desc: 'Data wedge, measured' },
    ],
  },
]

export default function WorkspaceShell({ children, title, subtitle, actions }) {
  const pathname = usePathname()
  const [health, setHealth] = useState(null)
  const [snap, setSnap] = useState(null)

  function refreshSnap() {
    setSnap(getWorkspaceSnapshot())
  }

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {})
    refreshSnap()
    window.addEventListener('meridian-context-change', refreshSnap)
    return () => window.removeEventListener('meridian-context-change', refreshSnap)
  }, [pathname])

  function navBadge(key) {
    if (!snap || !key) return null
    if (key === 'pendingReview' && snap.pendingReview > 0) return snap.pendingReview
    if (key === 'reviewedCount' && snap.reviewedCount > 0) return snap.reviewedCount
    return null
  }

  return (
    <FundGate>
      <ClerkLiveBanner />
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--m-bg)' }}>
        <aside className="m-workspace-sidebar flex w-[248px] shrink-0 flex-col">
          <div className="border-b px-4 py-4" style={{ borderColor: 'var(--m-sidebar-border)' }}>
            <Link href="/" className="flex items-center gap-3">
              <div className="m-logo text-[12px]">M</div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold" style={{ color: 'var(--m-text)', fontFamily: 'var(--m-serif)' }}>Meridian</div>
                <ActiveContextLabel />
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="mb-5 last:mb-0">
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--m-muted-2)' }}>
                  {group.label}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(item => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
                    const badge = navBadge(item.badgeKey)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`m-nav-item m-nav-item-rich ${active ? 'm-nav-item-active' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px]">{item.label}</span>
                            {badge != null && <span className="m-nav-badge">{badge}</span>}
                          </div>
                          <div className="text-[11px] font-normal" style={{ color: 'var(--m-muted-2)' }}>{item.desc}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t px-3 py-4" style={{ borderColor: 'var(--m-sidebar-border)' }}>
            <Link href="/fund" className="m-nav-item m-nav-item-rich">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">Fund settings</div>
                <div className="truncate text-[11px]" style={{ color: 'var(--m-muted-2)' }}>Thesis & portfolio</div>
              </div>
            </Link>

            {health && (
              <div className="mt-3 rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface-2)' }}>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--m-muted-2)' }}>
                  Status
                </div>
                {(() => {
                  const required = [
                    { on: health.features?.aiGeneration, label: 'Claude' },
                    { on: health.features?.deepResearch, label: 'Research' },
                    { on: health.features?.persistence, label: 'Database' },
                  ]
                  const failing = required.filter(s => !s.on)
                  const optionalOn = [
                    health.features?.indexChecks && 'StartupHub',
                    health.features?.shareLinks && 'Share links',
                    health.features?.serverPdf && 'Server PDF',
                    health.features?.auth && 'Auth',
                  ].filter(Boolean)

                  if (failing.length === 0) {
                    return (
                      <>
                        <div className="flex justify-between py-0.5 text-[11px]">
                          <span style={{ color: 'var(--m-muted)' }}>Core systems</span>
                          <span className="font-medium" style={{ color: 'var(--m-forest)' }}>ok</span>
                        </div>
                        {optionalOn.length > 0 && (
                          <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--m-muted-2)' }}>
                            {optionalOn.join(' · ')}
                          </div>
                        )}
                      </>
                    )
                  }

                  return failing.map(s => (
                    <div key={s.label} className="flex justify-between py-0.5 text-[11px]">
                      <span style={{ color: 'var(--m-muted)' }}>{s.label}</span>
                      <span className="font-medium text-amber-700">off</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b px-6" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
            <div className="min-w-0">
              {title && <h1 className="truncate text-[17px] font-semibold tracking-tight" style={{ color: 'var(--m-text)', fontFamily: 'var(--m-serif)' }}>{title}</h1>}
              {subtitle && <p className="mt-0.5 truncate text-[13px]" style={{ color: 'var(--m-muted)' }}>{subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <AuthBar />
              <Link href="/brief" className="m-btn-primary m-btn-sm">+ New brief</Link>
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-6 py-2" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
            <FundSwitcher onChange={refreshSnap} />
            <StrategySwitcher onChange={refreshSnap} />
          </div>

          <WorkflowStrip />
          <WorkspaceContextBar />

          <main className="flex-1 overflow-y-auto" style={{ background: 'var(--m-bg)' }}>{children}</main>
        </div>
      </div>
    </FundGate>
  )
}
