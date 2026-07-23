'use client'

import { useRouter } from 'next/navigation'
import { openDemoMemo } from '@/lib/demo-memo'
import { markDemoSeen } from '@/lib/onboarding'

export default function LandingDemoCta() {
  const router = useRouter()

  function handleDemo() {
    markDemoSeen()
    openDemoMemo(router)
  }

  return (
    <div className="rounded-2xl border p-8 text-center sm:p-10" style={{ background: 'var(--m-surface-2)', borderColor: 'var(--m-border)' }}>
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: 'var(--m-muted)' }}>Proof without API cost</p>
      <h3 className="mt-2 text-[22px] font-bold tracking-tight text-white">
        See the reference brief Meridian was built to match
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
        NationGraph — fund-native one-pager with thesis band, stats, and team. Instant load, no keys required.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={handleDemo} className="m-btn-primary">
          Open NationGraph demo
        </button>
        <button type="button" onClick={() => router.push('/brief')} className="m-btn-secondary">
          Generate your own →
        </button>
      </div>
    </div>
  )
}
