'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { needsWelcome, markWelcomeDone, markDemoSeen } from '@/lib/onboarding'
import { openDemoMemo } from '@/lib/demo-memo'

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

  function handleDemo() {
    markDemoSeen()
    markWelcomeDone()
    openDemoMemo(router)
  }

  function handleStart() {
    markWelcomeDone()
    setOpen(false)
    router.push('/brief')
  }

  return (
    <div className="m-overlay z-[100]">
      <div className="m-modal max-w-md">
        <p className="m-kicker mb-2">Welcome to Meridian</p>
        <h2 className="text-[18px] font-semibold tracking-tight">Your first brief in 90 seconds</h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
          Paste any company URL. Get a one-page memo with a fund-native thesis band — the section GPs actually forward.
        </p>

        <ol className="mt-5 space-y-3 text-[13px]">
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">01</span>
            <span>Paste a company URL (or try the NationGraph demo — zero API cost)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">02</span>
            <span>Review the memo, edit inline, pursue or pass</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-zinc-400">03</span>
            <span>Drop your fund URL — every brief gets sharper</span>
          </li>
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={handleStart} className="m-btn-primary w-full">
            Generate my first brief
          </button>
          <button type="button" onClick={handleDemo} className="m-btn-secondary w-full">
            See sample brief (NationGraph)
          </button>
          <button
            type="button"
            onClick={() => { markWelcomeDone(); setOpen(false) }}
            className="m-btn-ghost w-full text-[12px]"
          >
            Skip intro
          </button>
        </div>

        <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--m-muted)' }}>
          <Link href="/fund/setup" className="hover:underline">Personalize with fund URL →</Link>
        </p>
      </div>
    </div>
  )
}
