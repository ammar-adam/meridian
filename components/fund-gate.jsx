'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { hasFundProfile } from '@/lib/fund-profile'

/** Routes that work without fund setup — brief-first product */
const ALWAYS_OPEN = ['/', '/brief', '/memo', '/library', '/fund', '/fund/setup', '/team']

function isAlwaysOpen(pathname) {
  if (ALWAYS_OPEN.includes(pathname)) return true
  if (pathname.startsWith('/fund/')) return true
  return false
}

export default function FundGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isAlwaysOpen(pathname)) {
      setReady(true)
      return
    }
    if (!hasFundProfile()) {
      router.replace('/fund/setup?next=' + encodeURIComponent(pathname))
      return
    }
    setReady(true)
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="m-loader flex h-screen items-center justify-center">
        <p className="font-mono text-[11px]" style={{ color: 'var(--m-muted-2)' }}>Loading workspace…</p>
      </div>
    )
  }

  return children
}

export function FundPersonalizeBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(!hasFundProfile())
  }, [])

  if (!show) return null

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[13px] font-medium text-violet-950">Personalize your thesis band</p>
        <p className="mt-0.5 text-[12px] text-violet-800/80">
          Briefs work now with a generic fund context. Drop your fund URL to auto-fill mandate + portfolio.
        </p>
      </div>
      <Link href="/fund/setup" className="m-btn-primary m-btn-sm shrink-0 bg-violet-900 hover:bg-violet-800">
        Add fund URL →
      </Link>
    </div>
  )
}
