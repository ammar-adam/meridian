'use client'

import { useState } from 'react'
import { createFundProfile, saveFundProfile } from '@/lib/fund-profile'

const CHECK_SIZES = [
  'Up to $50k',
  '$50k – $250k',
  '$250k – $1M',
  '$1M+',
]

function splitList(text) {
  return (text || '')
    .split(/[,;\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 12)
}

/**
 * "I invest as myself" — family offices and angels don't have a fund URL to
 * scrape. A short form builds the same profile the fund path produces, so all
 * downstream machinery (flow, briefs, digests) works unchanged.
 */
export default function AllocatorSetup({ onSaved }) {
  const [name, setName] = useState('')
  const [interests, setInterests] = useState('')
  const [checkSize, setCheckSize] = useState(CHECK_SIZES[1])
  const [geography, setGeography] = useState('')
  const [error, setError] = useState('')

  function handleSave(e) {
    e.preventDefault()
    if (!interests.trim()) {
      setError('Tell us what you invest in — a sentence or a few keywords is enough')
      return
    }

    const displayName = `Personal — ${name.trim() || 'Family Office'}`
    const geoText = geography.trim()
    const thesis = [
      `${displayName} invests personal capital in: ${interests.trim()}.`,
      `Typical check size: ${checkSize}.`,
      geoText ? `Geography: ${geoText}.` : '',
    ].filter(Boolean).join(' ')

    const profile = createFundProfile({
      fundName: displayName,
      thesis,
      mandate: {
        stages: [],
        geographies: geoText ? splitList(geoText) : [],
        sectors: splitList(interests),
      },
    })

    saveFundProfile(profile)
    window.dispatchEvent(new Event('meridian-context-change'))
    onSaved?.(profile)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="m-kicker mb-1 block">Your name <span className="normal-case tracking-normal" style={{ color: 'var(--m-muted-2)' }}>(optional — used to label your workspace)</span></label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="m-input w-full text-[14px]"
          placeholder="e.g. Jordan Lee, or leave blank"
          maxLength={80}
        />
      </div>
      <div>
        <label className="m-kicker mb-1 block">What you invest in *</label>
        <textarea
          value={interests}
          onChange={e => setInterests(e.target.value)}
          rows={3}
          className="m-textarea w-full text-[14px]"
          placeholder="e.g. AI applied to healthcare, climate hardware, technical founders out of Waterloo"
          maxLength={600}
          required
        />
      </div>
      <div>
        <label className="m-kicker mb-1 block">Typical check size</label>
        <select
          value={checkSize}
          onChange={e => setCheckSize(e.target.value)}
          className="m-input w-full text-[14px]"
        >
          {CHECK_SIZES.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="m-kicker mb-1 block">Geography</label>
        <input
          value={geography}
          onChange={e => setGeography(e.target.value)}
          className="m-input w-full text-[14px]"
          placeholder="e.g. Canada, US East Coast — or leave blank for anywhere"
          maxLength={160}
        />
      </div>
      {error && <p className="m-alert-error text-[13px]">{error}</p>}
      <button type="submit" className="m-btn-primary w-full">
        Save &amp; start screening
      </button>
      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
        No fund website needed. You can refine all of this later in Fund settings.
      </p>
    </form>
  )
}
