'use client'

import { useState } from 'react'

/**
 * Founder reachability actions — real channels only.
 * Verified emails in the rate; pattern guesses behind explicit opt-in.
 */
export default function ReachabilityActions({ reach, company, compact = false }) {
  const [guessOpen, setGuessOpen] = useState(false)
  const [guessLoading, setGuessLoading] = useState(false)
  const [guesses, setGuesses] = useState(null)
  const [guessError, setGuessError] = useState('')

  if (!reach?.reachable && !reach?.founders?.length) return null

  const linkedin = reach.primaryLinkedIn
  const linkedinIsSearch = reach.searchOnly || reach.founders?.some(f => f.linkedinKind === 'search')
  const email = reach.primaryEmail
  const website = reach.website
  const founderName = company?.personName || reach.founders?.[0]?.name
  const domain = company?.domain || (website ? website.replace(/^https?:\/\//, '').split('/')[0] : '')

  async function loadGuesses() {
    if (!founderName || !domain) return
    setGuessLoading(true)
    setGuessError('')
    try {
      const res = await fetch('/api/founder-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderName, domain }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Guess failed')
      setGuesses(data.candidates || [])
      setGuessOpen(true)
    } catch (e) {
      setGuessError(e.message || 'Could not guess emails')
    } finally {
      setGuessLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[color:var(--m-ink-blue)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {linkedinIsSearch ? 'Search LinkedIn' : 'LinkedIn'}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="font-medium text-[color:var(--m-forest)] hover:underline"
            title="Verified email"
            onClick={(e) => e.stopPropagation()}
          >
            {email}
          </a>
        )}
        {!email && founderName && domain && (
          <button
            type="button"
            className="font-medium text-amber-800 hover:underline"
            onClick={(e) => { e.stopPropagation(); loadGuesses() }}
            disabled={guessLoading}
          >
            {guessLoading ? 'Guessing…' : 'Guess (unverified)'}
          </button>
        )}
        {!linkedin && !email && website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[color:var(--m-muted)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Website
          </a>
        )}
        {guessOpen && guesses?.length > 0 && (
          <span className="text-amber-800" title="Pattern guesses — not verified">
            {guesses[0].email}
          </span>
        )}
        {guessError && <span className="text-red-800">{guessError}</span>}
      </div>
    )
  }

  return (
    <div className="mt-1.5 space-y-1">
      {(reach.founders || []).slice(0, 2).map((f) => (
        <div key={f.name} className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-medium" style={{ color: 'var(--m-text)' }}>{f.name}</span>
          {f.linkedinUrl && (
            <a
              href={f.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--m-ink-blue)] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {f.linkedinKind === 'profile' ? 'Profile' : 'Search LinkedIn'}
            </a>
          )}
          {f.emails?.[0] && (
            <a
              href={`mailto:${f.emails[0]}`}
              className="font-mono text-[color:var(--m-forest)] hover:underline"
              title="Verified email"
              onClick={(e) => e.stopPropagation()}
            >
              {f.emails[0]}
            </a>
          )}
        </div>
      ))}
      {!email && founderName && domain && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            className="text-amber-800 hover:underline"
            onClick={(e) => { e.stopPropagation(); loadGuesses() }}
            disabled={guessLoading}
          >
            {guessLoading ? 'Guessing…' : 'Guess email (unverified)'}
          </button>
          {guessOpen && guesses?.map(g => (
            <span key={g.email} className="font-mono text-amber-800" title={g.confidence}>
              {g.email}
            </span>
          ))}
          {guessError && <span className="text-red-800">{guessError}</span>}
        </div>
      )}
    </div>
  )
}
