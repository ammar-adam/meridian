'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { populateTemplate } from '@/lib/populate-template'

export default function SharePage() {
  const params = useParams()
  const shareId = params?.id
  const [html, setHtml] = useState('')
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shareId) return
    fetch(`/api/share/${shareId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Share not found')
        }
        return res.json()
      })
      .then(async (payload) => {
        setMeta(payload.meta)
        const template = await fetch('/memo-template.html').then(r => r.text())
        setHtml(populateTemplate(template, payload.memoData))
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [shareId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--m-bg)' }}>
        <span className="text-[13px]" style={{ color: 'var(--m-muted)' }}>Loading brief…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: 'var(--m-bg)' }}>
        <p className="text-[14px] font-medium">Link unavailable</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="no-print fixed inset-x-0 top-0 z-40 border-b bg-white/95 px-4 py-3 backdrop-blur-sm" style={{ borderColor: 'var(--m-border)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-[13px] font-medium">{meta?.companyName}</p>
            <p className="text-[11px]" style={{ color: 'var(--m-muted)' }}>
              Shared via Meridian{meta?.fundName ? ` · ${meta.fundName}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="m-btn-secondary m-btn-sm">
            Save PDF
          </button>
        </div>
      </div>
      <div
        style={{ width: '210mm', margin: '0 auto', paddingTop: '4rem' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
