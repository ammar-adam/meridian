'use client'

import { useRouter } from 'next/navigation'
import { EXAMPLE_COMPANIES, openDemoMemo } from '@/lib/demo-memo'
import { markDemoSeen } from '@/lib/onboarding'

export default function BriefStarters({ onPickUrl, compact = false }) {
  const router = useRouter()

  function pick(url) {
    if (onPickUrl) onPickUrl(url)
    else router.push(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
  }

  function handleDemo() {
    markDemoSeen()
    openDemoMemo(router)
  }

  return (
    <div className={compact ? 'mt-4' : 'mt-6'}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--m-muted)' }}>
          Try an example
        </p>
        <button type="button" onClick={handleDemo} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--m-accent)' }}>
          Open demo brief →
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_COMPANIES.map((co) => (
          <button
            key={co.url}
            type="button"
            onClick={() => pick(co.url)}
            className="rounded-full border px-3 py-1.5 text-left text-[12px] transition hover:bg-[color:var(--m-surface-2)]"
            style={{ borderColor: 'var(--m-border)' }}
          >
            <span className="font-medium">{co.name}</span>
            <span className="ml-1.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>{co.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
