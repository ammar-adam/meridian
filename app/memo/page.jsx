'use client'

import { useEffect, useState } from 'react'
import { populateTemplate } from '@/lib/populate-template'
import { nationgraphData } from '@/lib/nationgraph-data'
import { saveMemo } from '@/lib/memo-library'

export default function MemoPage() {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [qualityGate, setQualityGate] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let data = nationgraphData
    let source = 'demo'
    let qg = null

    try {
      const stored = sessionStorage.getItem('memoData')
      if (stored) {
        data = JSON.parse(stored)
        source = sessionStorage.getItem('memoSource') || 'pipeline'
      }
      const qgStored = sessionStorage.getItem('qualityGate')
      if (qgStored) {
        qg = JSON.parse(qgStored)
        setQualityGate(qg)
      }
    } catch {
      // fall back to demo data
    }

    if (source === 'pipeline') {
      saveMemo(data)
    }

    if (qg && !qg.passed) {
      setBlocked(true)
      setLoading(false)
      return
    }

    fetch('/memo-template.html')
      .then((res) => res.text())
      .then((template) => {
        setHtml(populateTemplate(template, data))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading memo…
      </div>
    )
  }

  if (blocked && qualityGate && !qualityGate.passed) {
    const errors = qualityGate.flags.filter(f => f.severity === 'error')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-red-800">
            Memo failed quality checks
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            This memo has errors that must be resolved before showing to a GP.
          </p>
          <ul className="space-y-2">
            {errors.map((flag, i) => (
              <li key={i} className="text-xs text-red-700">
                <span className="font-medium">{flag.field}:</span> {flag.message}
              </li>
            ))}
          </ul>
          <a
            href="/"
            className="mt-6 inline-block text-xs text-gray-600 underline hover:text-gray-900"
          >
            ← Try another company
          </a>
        </div>
      </div>
    )
  }

  const warnings = qualityGate?.flags?.filter(f => f.severity === 'warn') ?? []
  const bannerOffset = warnings.length > 0 && !bannerDismissed

  return (
    <div>
      {bannerOffset && (
        <div className="print:hidden fixed inset-x-0 top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-amber-800">Verify before sharing</p>
              <ul className="mt-1 space-y-0.5">
                {warnings.map((flag, i) => (
                  <li key={i} className="text-xs text-amber-700">{flag.message}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-xs text-amber-600 hover:text-amber-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed right-4 z-50 print:hidden"
        style={{ top: bannerOffset ? '4.5rem' : '1rem' }}
      >
        <button
          onClick={() => {
            // TODO V1.5: replace with /api/export Playwright PDF route
            window.print()
          }}
          className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700"
        >
          Save as PDF
        </button>
      </div>

      <div
        style={{ width: '210mm', margin: '0 auto' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
