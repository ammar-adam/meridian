'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { hasUserFundProfile } from '@/lib/fund-profile'

/** Public / setup surfaces — everything else needs a claimed firm. */
const ALWAYS_OPEN = [
  '/',
  '/welcome',
  '/fund/setup',
  '/demo',
  '/pilot',
  '/about',
  '/pricing',
  '/privacy',
  '/terms',
  '/earliness',
  '/sign-in',
  '/sign-up',
]

function isAlwaysOpen(pathname) {
  if (ALWAYS_OPEN.includes(pathname)) return true
  if (pathname.startsWith('/fund/setup')) return true
  if (pathname.startsWith('/sign-in')) return true
  if (pathname.startsWith('/sign-up')) return true
  if (pathname.startsWith('/share/')) return true
  if (pathname.startsWith('/claim/')) return true
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
    if (!hasUserFundProfile()) {
      setReady(false)
      router.replace('/welcome?next=' + encodeURIComponent(pathname || '/flow'))
      return
    }
    setReady(true)
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--m-bg)' }}>
        <div className="text-center">
          <div className="m-logo mx-auto mb-3">M</div>
          <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>Opening sign-in…</p>
        </div>
      </div>
    )
  }

  return children
}
