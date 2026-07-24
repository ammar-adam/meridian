'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FundQuickSetup from '@/components/fund-quick-setup'
import AllocatorSetup from '@/components/allocator-setup'
import { hasFundProfile } from '@/lib/fund-profile'
import { normalizeUrl } from '@/lib/url-utils'
import PageLoader from '@/components/page-loader'

function FundSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [returning, setReturning] = useState(false)
  const [seedUrl, setSeedUrl] = useState('')
  const [seedName, setSeedName] = useState('')
  const [mode, setMode] = useState('personal')
  const nextPath = searchParams.get('next') || '/flow'

  useEffect(() => {
    setReturning(hasFundProfile())
  }, [])

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
    <div className="min-h-screen" style={{ background: 'var(--m-bg)' }}>
      <header className="border-b px-6 py-4" style={{ background: 'var(--m-surface)', borderColor: 'var(--m-border)' }}>
        <Link href="/" className="flex items-center gap-3">
          <div className="m-logo text-[12px]">M</div>
          <span className="text-[15px] font-semibold">Meridian</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-lg px-6 py-16 lg:py-24">
        <p className="font-mono text-[12px] font-medium text-[color:var(--m-accent)]">Optional setup</p>
        <h1 className="mt-3 text-[28px] font-bold tracking-tight text-[color:var(--m-text)]">
          {returning ? 'Sharpen what we watch for you' : 'Tell us what you invest in'}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
          Prefer the staging Sign in form?{' '}
          <Link href="/welcome?next=/flow" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--m-accent)' }}>
            Name your firm →
          </Link>
          {' '}
          {mode === 'personal'
            ? 'Family offices and angels can also use this short form.'
            : 'Or paste a fund site and we pull mandate details.'}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('personal')}
            className={mode === 'personal' ? 'm-btn-primary m-btn-sm' : 'm-btn-secondary m-btn-sm'}
          >
            I invest as myself
          </button>
          <button
            type="button"
            onClick={() => setMode('fund')}
            className={mode === 'fund' ? 'm-btn-primary m-btn-sm' : 'm-btn-secondary m-btn-sm'}
          >
            I have a fund website
          </button>
        </div>

        <div className="m-card m-card-pad mt-6">
          {mode === 'personal' ? (
            <AllocatorSetup onSaved={() => router.push(nextPath)} />
          ) : (
            <FundQuickSetup
              initialUrl={seedUrl}
              initialName={seedName}
              autoRun={!!seedUrl}
              onSaved={() => router.push(nextPath)}
            />
          )}
        </div>
        <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--m-muted)' }}>
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
