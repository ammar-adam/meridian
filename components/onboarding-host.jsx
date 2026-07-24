'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { hasUserFundProfile } from '@/lib/fund-profile'

// Landing + identity + legal — no forced redirect.
const OPEN_PATHS = [
  '/', '/welcome', '/demo', '/pilot', '/about', '/pricing', '/privacy', '/terms',
  '/earliness', '/fund/setup', '/sign-in', '/sign-up', '/claim', '/share',
]

/**
 * Soft redirect into staging Sign in when a workspace route is hit without a claimed firm.
 * (FundGate also enforces this inside WorkspaceShell.)
 */
export default function OnboardingHost() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const open = OPEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'))
    if (open) return
    if (hasUserFundProfile()) return
    if (pathname?.startsWith('/api')) return
    router.replace('/welcome?next=' + encodeURIComponent(pathname || '/flow'))
  }, [pathname, router])

  return null
}
