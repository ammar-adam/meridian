'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageLoader from '@/components/page-loader'
import { claimUserFund, hasUserFundProfile } from '@/lib/fund-profile'
import {
  INVESTOR_TYPES,
  buildIdentityThesis,
} from '@/lib/investor-identity'
import { markWelcomeDone } from '@/lib/onboarding'

function WelcomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/flow'

  const [typeId, setTypeId] = useState('venture_fund')
  const [name, setName] = useState('')
  const [focus, setFocus] = useState('')
  const [geography, setGeography] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (hasUserFundProfile()) {
      router.replace(nextPath)
    }
  }, [router, nextPath])

  function handleSubmit(e) {
    e.preventDefault()
    const firm = name.trim()
    const mandate = focus.trim()
    if (!firm) {
      setError('Enter your fund, family office, company, or your name as an angel.')
      return
    }
    if (!mandate) {
      setError('Tell us what you invest in — a sentence or a few keywords is enough.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const thesis = buildIdentityThesis({
        typeId,
        name: firm,
        focus: mandate,
        geography,
      })
      claimUserFund({
        fundName: firm,
        investorType: typeId,
        thesis,
        mandate: {
          stages: [],
          geographies: geography.trim()
            ? geography.split(/[,;]/).map(s => s.trim()).filter(Boolean)
            : [],
          sectors: mandate.split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 12),
        },
      })
      markWelcomeDone()
      window.dispatchEvent(new Event('meridian-context-change'))
      router.push(nextPath)
    } catch (err) {
      setError(err.message || 'Could not save — try again')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--m-bg)' }}>
      <header className="border-b px-6 py-4" style={{ background: 'var(--m-surface)', borderColor: 'var(--m-border)' }}>
        <Link href="/" className="flex items-center gap-3">
          <div className="m-logo text-[12px]">M</div>
          <span className="text-[15px] font-semibold tracking-tight">Meridian</span>
          <span className="text-[12px]" style={{ color: 'var(--m-muted)' }}>Staging</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-lg px-6 py-14 lg:py-20">
        <p className="m-kicker mb-2">Sign in · staging</p>
        <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: 'var(--m-text)' }}>
          Who&apos;s investing?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
          Clerk auth is off on this staging build. Tell us your firm — we&apos;ll
          match campus deal flow to your mandate. No Panache default.
        </p>

        <form onSubmit={handleSubmit} className="m-card m-card-pad mt-8 space-y-5">
          <div>
            <label className="m-label">I am a</label>
            <div className="flex flex-wrap gap-2">
              {INVESTOR_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeId(t.id)}
                  className={typeId === t.id ? 'm-btn-primary m-btn-sm' : 'm-btn-secondary m-btn-sm'}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="m-label" htmlFor="firm-name">
              {typeId === 'angel' ? 'Your name' : 'Firm name'} *
            </label>
            <input
              id="firm-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="m-input"
              placeholder={
                typeId === 'angel'
                  ? 'e.g. Jordan Lee'
                  : typeId === 'family_office'
                    ? 'e.g. Northwind Family Office'
                    : typeId === 'company'
                      ? 'e.g. Acme Ventures'
                      : 'e.g. Rivermark Capital'
              }
              maxLength={80}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="m-label" htmlFor="focus">What you invest in *</label>
            <textarea
              id="focus"
              value={focus}
              onChange={e => setFocus(e.target.value)}
              className="m-textarea"
              rows={3}
              placeholder="e.g. Pre-seed AI and enterprise software from Canadian and US universities"
              maxLength={600}
              required
            />
          </div>

          <div>
            <label className="m-label" htmlFor="geo">Geography (optional)</label>
            <input
              id="geo"
              value={geography}
              onChange={e => setGeography(e.target.value)}
              className="m-input"
              placeholder="e.g. Canada, US, UK"
              maxLength={160}
            />
          </div>

          {error && <p className="m-alert-error">{error}</p>}

          <button type="submit" className="m-btn-primary w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Continue to Deal Flow'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--m-muted)' }}>
          Recording a scripted demo?{' '}
          <Link href="/demo" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--m-accent)' }}>
            Load Panache demo kit
          </Link>
        </p>
      </main>
    </div>
  )
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <WelcomeContent />
    </Suspense>
  )
}
