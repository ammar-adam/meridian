'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { needsWelcome, markWelcomeDone } from '@/lib/onboarding'
import { getFundProfile } from '@/lib/fund-profile'

// Externally-shared surfaces: founders and memo recipients are not investors
// setting up a workspace — never show them the investor welcome modal.
const EXTERNAL_PATHS = ['/claim', '/share']

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
        <h2 className="text-[18px] font-semibold tracking-tight">Your mandate, watched</h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
          Choose your fund, open Deal Flow, and Meridian surfaces Canadian community companies with coverage proof and founder reach — before public indexes.
        </p>

        <ol className="mt-5 space-y-3 text-[13px]">
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">01</span>
            <span>Choose your fund (or add one from a fund URL)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">02</span>
            <span>Watch Deal Flow — Velocity, DMZ, CDL with pre-index proof</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">03</span>
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
