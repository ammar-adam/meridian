'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { needsWelcome, markWelcomeDone } from '@/lib/onboarding'
import { getFundProfile } from '@/lib/fund-profile'

// Externally-shared surfaces: founders, memo recipients, and visitors reading
// public pages are not investors setting up a workspace — never show them the
// investor welcome modal.
const EXTERNAL_PATHS = ['/claim', '/share', '/about', '/pricing', '/privacy', '/terms', '/earliness']

export default function OnboardingHost() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
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

  function handleStart() {
    markWelcomeDone()
    setOpen(false)
    // No active fund yet → fund setup; otherwise Brief with empty URL
    if (!getFundProfile()) router.push('/fund/setup?next=/flow')
    else router.push('/flow')
  }

  return (
    <div className="m-overlay z-[100]">
      <div className="m-modal max-w-md">
        <p className="m-kicker mb-2">Welcome to Meridian</p>
        <h2 className="text-[18px] font-semibold tracking-tight">Startups, found early — with proof</h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
          Tell us what you invest in and Meridian surfaces early Canadian companies with founder contacts and a dated receipt for each one — before the big databases.
        </p>

        <ol className="mt-5 space-y-3 text-[13px]">
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald-400">01</span>
            <span>Tell us what you invest in — set up your fund from its website, or as an individual (angel or family office)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald-400">02</span>
            <span>Watch Deal Flow — Velocity, DMZ, CDL, found before the big databases</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald-400">03</span>
            <span>Brief, pursue or pass — signals compound on Thesis</span>
          </li>
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={handleStart} className="m-btn-primary w-full">
            Open Deal Flow
          </button>
          <button
            type="button"
            onClick={() => { markWelcomeDone(); setOpen(false); router.push('/fund/setup') }}
            className="m-btn-secondary w-full"
          >
            Set up my fund
          </button>
          <button
            type="button"
            onClick={() => { markWelcomeDone(); setOpen(false) }}
            className="m-btn-ghost w-full text-[12px]"
          >
            Skip intro
          </button>
        </div>
      </div>
    </div>
  )
}
