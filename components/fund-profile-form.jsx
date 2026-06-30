'use client'

import { useState } from 'react'
import IntakeDropzone from '@/components/intake-dropzone'
import { guessFundNameFromUrl } from '@/lib/intake-parser'
import {
  createFundProfile,
  createStrategy,
  saveFundProfile,
  addFund,
  slugify,
} from '@/lib/fund-profile'
import MetricPreferencesPicker from '@/components/metric-preferences-picker'
import { DEFAULT_METRIC_PREFERENCES } from '@/lib/metric-preferences'

function FieldLabel({ children }) {
  return <label className="mb-1.5 block m-kicker">{children}</label>
}

function guessFundName(url) {
  return guessFundNameFromUrl(url)
}

function emptyPortfolio() {
  return [{ name: '', domain: '', description: '' }]
}

export default function FundProfileForm({ initial, onSaved, setupMode = false, newFund = false }) {
  const [fundName, setFundName] = useState(initial?.fundName || '')
  const [fundWebsiteUrl, setFundWebsiteUrl] = useState(initial?.fundWebsiteUrl || '')
  const [fundLogoUrl, setFundLogoUrl] = useState(initial?.fundLogoUrl || '')
  const [portfolio, setPortfolio] = useState(
    initial?.portfolio?.length ? initial.portfolio : emptyPortfolio()
  )
  const [strategies, setStrategies] = useState(
    initial?.strategies?.length
      ? initial.strategies
      : [{ id: 'primary', name: 'Primary', thesis: initial?.thesis || '', metricPreferences: DEFAULT_METRIC_PREFERENCES }]
  )
  const [activeStrategyIdx, setActiveStrategyIdx] = useState(0)
  const [enriching, setEnriching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const active = strategies[activeStrategyIdx] || strategies[0]

  async function handleEnrich(urlOverride, nameOverride) {
    const site = (urlOverride || fundWebsiteUrl).trim()
    const name = (nameOverride || fundName).trim()
    if (!site) {
      setError('Enter fund website URL first')
      return
    }
    setEnriching(true)
    setError('')
    try {
      const res = await fetch('/api/fund-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundName: name || guessFundName(site), fundWebsiteUrl: site }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Enrichment failed')
      }
      const { draft } = await res.json()
      if (draft.fundName) setFundName(draft.fundName)
      if (draft.fundWebsiteUrl) setFundWebsiteUrl(draft.fundWebsiteUrl)
      if (draft.portfolio?.length) setPortfolio(draft.portfolio)
      if (draft.thesis) {
        setStrategies(prev => prev.map((s, i) => i === activeStrategyIdx ? { ...s, thesis: draft.thesis } : s))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setEnriching(false)
    }
  }

  function updatePortfolio(i, field, value) {
    setPortfolio(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  function updateStrategy(i, field, value) {
    setStrategies(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function addStrategy() {
    const n = strategies.length + 1
    setStrategies(prev => [...prev, {
      id: slugify(`strategy_${n}`),
      name: `Strategy ${n}`,
      thesis: '',
      metricPreferences: [...DEFAULT_METRIC_PREFERENCES],
    }])
    setActiveStrategyIdx(strategies.length)
  }

  function removeStrategy(i) {
    if (strategies.length <= 1) return
    setStrategies(prev => prev.filter((_, idx) => idx !== i))
    setActiveStrategyIdx(Math.max(0, i - 1))
  }

  function handleSave(e) {
    e.preventDefault()
    if (!fundName.trim()) {
      setError('Fund name is required')
      return
    }
    const normalizedStrategies = strategies.map(s => createStrategy(s))
    if (!normalizedStrategies.some(s => s.thesis.trim())) {
      setError('At least one strategy needs a thesis')
      return
    }

    setSaving(true)
    setError('')

    const payload = createFundProfile({
      ...initial,
      fundName: fundName.trim(),
      fundWebsiteUrl: fundWebsiteUrl.trim(),
      fundLogoUrl: fundLogoUrl.trim(),
      portfolio: portfolio.filter(p => p.name?.trim()),
      strategies: normalizedStrategies,
      activeStrategyId: normalizedStrategies[activeStrategyIdx]?.id || normalizedStrategies[0].id,
    })

    const profile = newFund ? addFund(payload) : saveFundProfile(payload)
    setSaving(false)
    onSaved?.(profile)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Fund name</FieldLabel>
          <input value={fundName} onChange={e => setFundName(e.target.value)} className="m-input" placeholder="Acme Ventures" />
        </div>
        <div>
          <FieldLabel>Fund website</FieldLabel>
          <input value={fundWebsiteUrl} onChange={e => setFundWebsiteUrl(e.target.value)} className="m-input font-mono" placeholder="acme.vc" />
        </div>
      </div>

      <IntakeDropzone
        compact
        onIntake={async (payload) => {
          if (payload.kind === 'fund_url') {
            setFundWebsiteUrl(payload.fundUrl)
            if (payload.fundName) setFundName(payload.fundName)
            await handleEnrich(payload.fundUrl, payload.fundName)
            return
          }
          if (payload.kind === 'portfolio' && payload.portfolio?.length) {
            setPortfolio(payload.portfolio)
          }
        }}
        hint="Portfolio CSV, company list, or fund URL"
        className="mb-4"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={() => handleEnrich()} disabled={enriching} className="m-btn-secondary shrink-0 disabled:opacity-50">
          {enriching ? 'Pulling fund context…' : 'Auto-enrich from website'}
        </button>
        <span className="text-[11px]" style={{ color: 'var(--m-muted-2)' }}>
          Applies to the active strategy below
        </span>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <FieldLabel>Investment strategies</FieldLabel>
          <button type="button" onClick={addStrategy} className="m-btn-ghost m-btn-sm">+ Add strategy</button>
        </div>
        <p className="mb-3 text-[12px]" style={{ color: 'var(--m-muted)' }}>
          Each strategy is a separate mandate (e.g. AI Fund, Growth, Seed). Discover, briefs, and thesis signals are scoped to the active strategy.
        </p>

        <div className="mb-2 flex flex-wrap gap-1">
          {strategies.map((s, i) => (
            <button
              key={s.id || i}
              type="button"
              onClick={() => setActiveStrategyIdx(i)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                i === activeStrategyIdx ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {s.name || `Strategy ${i + 1}`}
            </button>
          ))}
        </div>

        <div className="m-card m-card-pad space-y-4">
          <div className="flex items-center justify-between gap-2">
            <input
              value={active?.name || ''}
              onChange={e => updateStrategy(activeStrategyIdx, 'name', e.target.value)}
              className="m-input m-input-sm max-w-[200px] font-medium"
              placeholder="Strategy name"
            />
            {strategies.length > 1 && (
              <button type="button" onClick={() => removeStrategy(activeStrategyIdx)} className="m-btn-ghost m-btn-sm text-red-600">
                Remove
              </button>
            )}
          </div>
          <textarea
            value={active?.thesis || ''}
            onChange={e => updateStrategy(activeStrategyIdx, 'thesis', e.target.value)}
            rows={6}
            className="m-textarea"
            placeholder="Stage, sector, geography, value-add for this strategy…"
          />
          <MetricPreferencesPicker
            value={active?.metricPreferences}
            onChange={(prefs) => updateStrategy(activeStrategyIdx, 'metricPreferences', prefs)}
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <FieldLabel>Portfolio (shared across strategies)</FieldLabel>
          <button type="button" onClick={() => setPortfolio(prev => [...prev, { name: '', domain: '', description: '' }])} className="m-btn-ghost m-btn-sm">
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {portfolio.map((row, i) => (
            <div key={i} className="m-card grid gap-2 p-3 sm:grid-cols-3">
              <input value={row.name} onChange={e => updatePortfolio(i, 'name', e.target.value)} placeholder="Company" className="m-input m-input-sm" />
              <input value={row.domain} onChange={e => updatePortfolio(i, 'domain', e.target.value)} placeholder="domain.com" className="m-input m-input-sm font-mono" />
              <div className="flex gap-2">
                <input value={row.description} onChange={e => updatePortfolio(i, 'description', e.target.value)} placeholder="One-line" className="m-input m-input-sm min-w-0 flex-1" />
                {portfolio.length > 1 && (
                  <button type="button" onClick={() => setPortfolio(prev => prev.filter((_, idx) => idx !== i))} className="m-btn-ghost m-btn-sm px-2">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!setupMode && (
        <div>
          <FieldLabel>Logo URL (optional)</FieldLabel>
          <input value={fundLogoUrl} onChange={e => setFundLogoUrl(e.target.value)} className="m-input font-mono" placeholder="https://…" />
        </div>
      )}

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

      <button type="submit" disabled={saving} className="m-btn-primary disabled:opacity-50">
        {saving ? 'Saving…' : setupMode ? 'Save & enter workspace' : 'Save fund profile'}
      </button>
    </form>
  )
}
