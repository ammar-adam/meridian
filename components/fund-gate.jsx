'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { hasFundProfile } from '@/lib/fund-profile'

const ALWAYS_OPEN = ['/', '/brief', '/memo', '/library', '/lists', '/discover', '/flow', '/pilot', '/demo', '/thesis', '/fund', '/fund/setup', '/team']

function isAlwaysOpen(pathname) {
  if (ALWAYS_OPEN.includes(pathname)) return true
  if (pathname.startsWith('/fund/')) return true
  return false
}

export default function FundGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(() => isAlwaysOpen(pathname))

  useEffect(() => {
    if (isAlwaysOpen(pathname)) {
      setReady(true)
      return
    }
    if (!hasFundProfile()) {
      setReady(false)
      router.replace('/fund/setup?next=' + encodeURIComponent(pathname))
      return
    }
    setReady(true)
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--m-bg)' }}>
        <div className="text-center">
          <div className="m-logo mx-auto mb-3">M</div>
          <p className="text-[12px]" style={{ color: 'var(--m-muted)' }}>Loading workspace…</p>
        </div>
      </div>
    )
  }

  return children
}

/** Frozen until fund sync ships — guest context is default */
export function FundPersonalizeBanner() {
  return null
}
