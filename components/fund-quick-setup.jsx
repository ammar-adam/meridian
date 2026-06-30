'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeDropzone from '@/components/intake-dropzone'
import { createFundProfile, saveFundProfile } from '@/lib/fund-profile'
import { DEFAULT_METRIC_PREFERENCES } from '@/lib/metric-preferences'
import MetricPreferencesPicker from '@/components/metric-preferences-picker'
import { importPipelineContacts } from '@/lib/pipeline-contacts'
import { extractDomain, normalizeUrl } from '@/lib/url-utils'
import { guessFundNameFromUrl } from '@/lib/intake-parser'

export default function FundQuickSetup({ initialUrl = '', initialName = '', autoRun = false, onSaved }) {
  const router = useRouter()
  const [fundUrl, setFundUrl] = useState(initialUrl)
  const [fundName, setFundName] = useState(initialName)
  const [enriching, setEnriching] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [metricPreferences, setMetricPreferences] = useState(DEFAULT_METRIC_PREFERENCES)

  useEffect(() => {
    if (initialUrl) setFundUrl(initialUrl)
    if (initialName) setFundName(initialName)
  }, [initialUrl, initialName])

  useEffect(() => {
    if (autoRun && initialUrl && !preview && !enriching) {
      runEnrich(initialUrl, initialName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialUrl])

  async function runEnrich(url, name) {
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setError('Enter a valid fund website URL')
      return
    }

    setEnriching(true)
    setError('')
    setPreview(null)

    try {
      const res = await fetch('/api/fund-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: name?.trim() || guessFundNameFromUrl(normalized),
          fundWebsiteUrl: normalized,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Could not pull fund context')
      }
      const { draft, cached } = await res.json()
      setFundUrl(draft.fundWebsiteUrl || normalized)
      setFundName(draft.fundName || name || guessFundNameFromUrl(normalized))
      setPreview({ ...draft, cached })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnriching(false)
    }
  }

  async function handleIntake(payload) {
    if (payload.kind === 'fund_url') {
      setFundUrl(payload.fundUrl)
      setFundName(payload.fundName || '')
      await runEnrich(payload.fundUrl, payload.fundName)
      return
    }
    if (payload.kind === 'portfolio' && payload.portfolio?.length) {
      if (!fundUrl) {
        setError('Add your fund website first, then drop a portfolio list')
        return
      }
      setPreview(prev => ({
        ...(prev || { fundName: fundName || guessFundNameFromUrl(fundUrl), fundWebsiteUrl: fundUrl, thesis: '' }),
        portfolio: payload.portfolio,
      }))
      return
    }
    if (payload.kind === 'pipeline' && payload.pipeline?.length) {
      const { added } = importPipelineContacts(payload.pipeline)
      if (!fundUrl) {
        setError(null)
        setPreview(prev => prev || { importedContacts: added })
      }
      setPreview(prev => ({ ...(prev || {}), importedContacts: added }))
    }
  }

  function handleSave() {
    if (!preview?.thesis?.trim() && !fundUrl) {
      setError('We need at least your fund website to continue')
      return
    }

    const profile = createFundProfile({
      fundName: preview?.fundName || fundName || guessFundNameFromUrl(fundUrl),
      fundWebsiteUrl: fundUrl,
      thesis: preview?.thesis || '',
      portfolio: preview?.portfolio || [],
      mandate: preview?.mandate,
      thesisInstructions: preview?.thesisInstructions,
      strategies: [{
        id: 'primary',
        name: 'Primary',
        thesis: preview?.thesis || '',
        portfolio: preview?.portfolio || [],
        mandate: preview?.mandate,
        metricPreferences,
      }],
    })

    saveFundProfile(profile)
    window.dispatchEvent(new Event('meridian-context-change'))
    if (onSaved) {
      onSaved(profile)
    } else {
      router.push('/brief')
    }
  }

  return (
    <div className="space-y-6">
      <IntakeDropzone
        onIntake={handleIntake}
        hint="Fund website URL, portfolio CSV, contact export (.vcf), or paste a list of companies"
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-zinc-200" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wide text-zinc-400">
          <span className="bg-white px-2">or paste URL</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={fundUrl}
          onChange={(e) => setFundUrl(e.target.value)}
          placeholder="yourfund.vc"
          className="m-input flex-1 font-mono"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runEnrich(fundUrl, fundName))}
        />
        <button
          type="button"
          onClick={() => runEnrich(fundUrl, fundName)}
          disabled={enriching || !fundUrl.trim()}
          className="m-btn-primary shrink-0 disabled:opacity-50"
        >
          {enriching ? 'Pulling context…' : 'Auto-fill'}
        </button>
      </div>

      {preview && (
        <div className="m-card m-card-pad space-y-3 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">{preview.fundName || fundName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{extractDomain(fundUrl)}</p>
            </div>
            {preview.cached && (
              <span className="m-badge-low">cached</span>
            )}
          </div>
          {preview.thesis && (
            <p className="text-[13px] leading-relaxed text-zinc-600 line-clamp-4">{preview.thesis}</p>
          )}
          <div className="flex flex-wrap gap-3 font-mono text-[11px] text-zinc-500">
            {preview.portfolio?.length > 0 && <span>{preview.portfolio.length} portfolio cos</span>}
            {preview.mandate?.stages?.length > 0 && <span>{preview.mandate.stages.join(', ')}</span>}
            {preview.importedContacts > 0 && <span>{preview.importedContacts} contacts imported</span>}
          </div>
          <MetricPreferencesPicker
            value={metricPreferences}
            onChange={setMetricPreferences}
            compact
          />
          <button type="button" onClick={handleSave} className="m-btn-primary w-full">
            Save & start screening
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="m-btn-ghost m-btn-sm text-zinc-500"
      >
        {showAdvanced ? 'Hide manual fields' : 'Edit manually instead'}
      </button>

      {showAdvanced && (
        <div className="space-y-3 border-t border-zinc-200 pt-4">
          <label className="m-kicker">Fund name override</label>
          <input value={fundName} onChange={(e) => setFundName(e.target.value)} className="m-input" placeholder="Display name" />
          {preview?.thesis && (
            <>
              <label className="m-kicker">Thesis (editable)</label>
              <textarea
                value={preview.thesis}
                onChange={(e) => setPreview({ ...preview, thesis: e.target.value })}
                rows={5}
                className="m-textarea"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
