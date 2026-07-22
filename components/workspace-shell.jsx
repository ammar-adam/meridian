'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getWorkspaceSnapshot } from '@/lib/workspace-snapshot'
import FundGate from '@/components/fund-gate'
import WorkflowStrip from '@/components/workflow-strip'
import WorkspaceContextBar from '@/components/workspace-context-bar'
import AuthBar from '@/components/auth-bar'
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
      <div className="flex h-screen overflow-hidden bg-zinc-50">
        <aside className="m-workspace-sidebar flex w-[248px] shrink-0 flex-col">
          <div className="border-b border-white/[0.08] px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="m-logo m-logo-light text-[12px]">M</div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-white">Meridian</div>
                <ActiveContextLabel />
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="mb-5 last:mb-0">
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
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
                          <div className="text-[11px] font-normal text-zinc-600">{item.desc}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/[0.08] px-3 py-4">
            <Link href="/fund" className="m-nav-item m-nav-item-rich">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">Fund settings</div>
                <div className="truncate text-[11px] text-zinc-600">Thesis & portfolio</div>
              </div>
            </Link>

            {health && (
              <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
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
                          <span className="text-zinc-500">Core systems</span>
                          <span className="text-emerald-400">ok</span>
                        </div>
                        {optionalOn.length > 0 && (
                          <div className="mt-1 text-[10px] leading-relaxed text-zinc-600">
                            {optionalOn.join(' · ')}
                          </div>
                        )}
                      </>
                    )
                  }

                  return failing.map(s => (
                    <div key={s.label} className="flex justify-between py-0.5 text-[11px]">
                      <span className="text-zinc-500">{s.label}</span>
                      <span className="text-amber-400">off</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
            <div className="min-w-0">
              {title && <h1 className="truncate text-[16px] font-semibold tracking-tight text-zinc-900">{title}</h1>}
              {subtitle && <p className="mt-0.5 truncate text-[13px] text-zinc-500">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <AuthBar />
              <Link href="/brief" className="m-btn-primary m-btn-sm">+ New brief</Link>
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-6 py-2">
            <FundSwitcher onChange={refreshSnap} />
            <StrategySwitcher onChange={refreshSnap} />
          </div>

          <WorkflowStrip />
          <WorkspaceContextBar />

          <main className="flex-1 overflow-y-auto bg-zinc-50">{children}</main>
        </div>
      </div>
    </FundGate>
  )
}
