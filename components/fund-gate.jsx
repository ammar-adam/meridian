'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { hasFundProfile } from '@/lib/fund-profile'

const ALWAYS_OPEN = ['/', '/brief', '/memo', '/library', '/lists', '/discover', '/flow', '/pilot', '/thesis', '/fund', '/fund/setup', '/team']

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

/** Frozen until fund sync ships — guest context is default */
export function FundPersonalizeBanner() {
  return null
}
