'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FundQuickSetup from '@/components/fund-quick-setup'
import { hasFundProfile } from '@/lib/fund-profile'
import { normalizeUrl } from '@/lib/url-utils'
import PageLoader from '@/components/page-loader'

function FundSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returning = hasFundProfile()
  const [seedUrl, setSeedUrl] = useState('')
  const [seedName, setSeedName] = useState('')
  const nextPath = searchParams.get('next') || '/brief'

  useEffect(() => {
    const url = sessionStorage.getItem('meridian_setup_url')
    const name = sessionStorage.getItem('meridian_setup_name')
    if (url) {
      setSeedUrl(normalizeUrl(url) || url)
      sessionStorage.removeItem('meridian_setup_url')
    }
    if (name) {
      setSeedName(name)
      sessionStorage.removeItem('meridian_setup_name')
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="m-logo text-[12px]">M</div>
          <span className="text-[15px] font-semibold">Meridian</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-lg px-6 py-16 lg:py-24">
        <p className="font-mono text-[12px] font-medium text-violet-600">Personalize</p>
        <h1 className="mt-3 text-[28px] font-bold tracking-tight text-zinc-900">
          {returning ? 'Sharpen your thesis band' : 'One URL. We do the rest.'}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">
          Drop your fund website — we pull mandate, portfolio, and stage focus automatically.
        </p>
        <div className="m-card m-card-pad mt-10">
          <FundQuickSetup
            initialUrl={seedUrl}
            initialName={seedName}
            autoRun={!!seedUrl}
            onSaved={() => router.push(nextPath)}
          />
        </div>
        <p className="mt-6 text-center text-[13px] text-zinc-500">
          <button type="button" onClick={() => router.push('/brief')} className="underline-offset-2 hover:underline">
            Skip — brief with generic fund context →
          </button>
        </p>
      </main>
    </div>
  )
}

export default function FundSetupPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <FundSetupContent />
    </Suspense>
  )
}
