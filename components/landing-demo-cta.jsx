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
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center sm:p-10">
      <p className="text-[13px] font-medium uppercase tracking-wide text-zinc-500">Proof without API cost</p>
      <h3 className="mt-2 text-[22px] font-bold tracking-tight text-zinc-900">
        See the memo that got Sagard sourcing credit
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-zinc-500">
        NationGraph — the reference brief Meridian was built to match. Instant load, no keys required.
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
