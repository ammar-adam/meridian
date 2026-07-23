'use client'

import { useEffect, useState } from 'react'

/**
 * Warn when production runs Clerk test keys (credibility gap from persona audit).
 */
export default function ClerkLiveBanner() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  const isTestKey = pk.startsWith('pk_test_')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isTestKey || !pk) return
    const host = window.location.hostname
    const isProdHost = host.includes('vercel.app') || host.includes('meridian')
    setShow(isProdHost)
  }, [isTestKey, pk])

  if (!show) return null

  return (
    <div className="border-b border-amber-700/40 bg-amber-500/10 px-4 py-2 text-center text-[12px] text-amber-800">
      Clerk is in <strong>test mode</strong> on this deployment — swap to{' '}
      <code className="font-mono">pk_live_</code> / <code className="font-mono">sk_live_</code> on Vercel for investor-ready auth.
    </div>
  )
}
