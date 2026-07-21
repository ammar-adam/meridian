'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { needsWelcome, markWelcomeDone } from '@/lib/onboarding'
import { getFundProfile } from '@/lib/fund-profile'

export default function OnboardingHost() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (needsWelcome()) setOpen(true)
    const onChange = () => {
      if (!needsWelcome()) setOpen(false)
    }
    window.addEventListener('meridian-onboarding-change', onChange)
    return () => window.removeEventListener('meridian-onboarding-change', onChange)
  }, [])

  if (!open) return null

  function handleStart() {
    markWelcomeDone()
    setOpen(false)
    // No active fund yet → fund setup; otherwise Brief with empty URL
    if (!getFundProfile()) router.push('/fund/setup?next=/brief')
    else router.push('/brief')
  }

  return (
    <div className="m-overlay z-[100]">
      <div className="m-modal max-w-md">
        <p className="m-kicker mb-2">Welcome to Meridian</p>
        <h2 className="text-[18px] font-semibold tracking-tight">Your first brief in about a minute</h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
          Pick your fund, paste any company URL, get a one-page memo with a fund-native thesis band — the section GPs actually forward.
        </p>

        <ol className="mt-5 space-y-3 text-[13px]">
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">01</span>
            <span>Choose your fund (or add one from a fund URL)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">02</span>
            <span>Paste any company URL — or Discover against your thesis</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">03</span>
            <span>Review the memo, edit inline, pursue or pass</span>
          </li>
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={handleStart} className="m-btn-primary w-full">
            Choose fund &amp; brief a company
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
