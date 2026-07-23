'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { shouldShowFundPrompt, dismissFundPrompt } from '@/lib/onboarding'
import { isGuestFundContext } from '@/lib/fund-defaults'
import { getFundProfile } from '@/lib/fund-profile'

export default function FundSetupPrompt({ force = false }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const profile = getFundProfile()
    const guest = isGuestFundContext(profile ? { id: profile.id } : null)
    setVisible(force || (guest && shouldShowFundPrompt()))
    const refresh = () => {
      const p = getFundProfile()
      setVisible(force || (isGuestFundContext(p ? { id: p.id } : null) && shouldShowFundPrompt()))
    }
    window.addEventListener('meridian-onboarding-change', refresh)
    window.addEventListener('meridian-context-change', refresh)
    return () => {
      window.removeEventListener('meridian-onboarding-change', refresh)
      window.removeEventListener('meridian-context-change', refresh)
    }
  }, [force])

  if (!visible) return null

  return (
    <div className="m-card m-card-pad mb-6 border-emerald-400/30 bg-emerald-400/10">
      <p className="text-[13px] font-medium text-emerald-200">Make the thesis band yours</p>
      <p className="mt-1 text-[12px] text-emerald-200">
        You&apos;re on generic fund context. Drop your fund URL — portfolio, mandate, and thesis band personalize in ~30 seconds.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/fund/setup?next=/brief" className="m-btn-accent m-btn-sm">
          Personalize fund →
        </Link>
        <button
          type="button"
          onClick={() => { dismissFundPrompt(); setVisible(false) }}
          className="m-btn-ghost m-btn-sm text-emerald-300"
        >
          Later
        </button>
      </div>
    </div>
  )
}
