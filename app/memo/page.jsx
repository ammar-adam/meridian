'use client'

import { useEffect, useState } from 'react'
import { populateTemplate } from '@/lib/populate-template'
import { nationgraphData } from '@/lib/nationgraph-data'

export default function MemoPage() {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let data = nationgraphData
    try {
      const stored = sessionStorage.getItem('memoData')
      if (stored) {
        data = JSON.parse(stored)
      }
    } catch {
      // fall back to demo data
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

  return (
    <div>
      <div className="fixed right-4 top-4 z-50 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700"
        >
          Print / Save PDF
        </button>
      </div>
      <div
        style={{ width: '210mm', margin: '0 auto' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
