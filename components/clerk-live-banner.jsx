'use client'

/**
 * Hidden for investor demos — pk_test works for guest flow; the yellow banner
 * made production look unfinished. Re-enable by setting
 * NEXT_PUBLIC_SHOW_CLERK_BANNER=1 when debugging auth keys.
 */
export default function ClerkLiveBanner() {
  if (process.env.NEXT_PUBLIC_SHOW_CLERK_BANNER !== '1') return null

  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  if (!pk.startsWith('pk_test_')) return null

  return (
    <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-[12px] text-amber-200">
      Clerk is in <strong>test mode</strong> on this deployment — swap to{' '}
      <code className="font-mono">pk_live_</code> / <code className="font-mono">sk_live_</code> on Vercel for investor-ready auth.
    </div>
  )
}
