'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { needsWelcome, markWelcomeDone } from '@/lib/onboarding'
import { getFundProfile } from '@/lib/fund-profile'

// Surfaces that should never see the investor welcome modal.
const EXTERNAL_PATHS = [
  '/claim', '/share', '/about', '/pricing', '/privacy', '/terms',
  '/earliness', '/demo', '/pilot', '/schools',
]

export default function OnboardingHost() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isExternal = EXTERNAL_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'))

  useEffect(() => {
    if (needsWelcome()) setOpen(true)
    const onChange = () => {
      if (!needsWelcome()) setOpen(false)
    }
    window.addEventListener('meridian-onboarding-change', onChange)
    return () => window.removeEventListener('meridian-onboarding-change', onChange)
  }, [])

  if (!open || isExternal) return null

  function go(path) {
    markWelcomeDone()
    setOpen(false)
    window.location.assign(path)
  }

  return (
    <div className="m-overlay z-[100]">
      <div className="m-modal max-w-md">
        <p className="m-kicker mb-2">Welcome to Meridian</p>
        <h2 className="text-[18px] font-semibold tracking-tight">School ecosystems → fund mandates</h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
          Configure your mandate once. Meridian surfaces early companies from
          Tier-1 — and emerging — universities in Canada, the US, and the UK,
          with founders and dated proof. We only claim what we can source.
        </p>

        <ol className="mt-5 space-y-3 text-[13px]">
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-[color:var(--m-accent)]">01</span>
            <span>Set your fund mandate (or personal thesis)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-[color:var(--m-accent)]">02</span>
            <span>Open Deal Flow / Schools — campus ecosystems matched to you</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-[color:var(--m-accent)]">03</span>
            <span>Brief, pursue or pass — signals compound on Thesis</span>
          </li>
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={() => go(getFundProfile() ? '/flow' : '/fund/setup?next=/flow')} className="m-btn-primary w-full">
            Open Deal Flow
          </button>
          <button type="button" onClick={() => go('/fund/setup')} className="m-btn-secondary w-full">
            Set up my fund
          </button>
          <button type="button" onClick={() => { markWelcomeDone(); setOpen(false) }} className="m-btn-ghost w-full text-[12px]">
            Skip intro
          </button>
        </div>
      </div>
    </div>
  )
}
