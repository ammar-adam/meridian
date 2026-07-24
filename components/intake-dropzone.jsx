'use client'

import { useCallback, useState } from 'react'
import { parseIntakeFile, parseIntakeText } from '@/lib/intake-parser'

export default function IntakeDropzone({
  onIntake,
  accept = '.csv,.txt,.vcf,text/plain',
  hint = 'Drop a file, paste a URL, portfolio CSV, or contact export',
  compact = false,
  className = '',
}) {
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const handle = useCallback(async (payload) => {
    if (!payload || payload.kind === 'empty' || payload.kind === 'unknown') return
    await onIntake?.(payload)
  }, [onIntake])

  async function processText(text, filename = '') {
    const payload = parseIntakeText(text, { filename })
    await handle(payload)
  }

  async function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) {
      const text = e.dataTransfer.getData('text')
      if (text) await processText(text)
      return
    }
    setBusy(true)
    try {
      const payload = await parseIntakeFile(file)
      await handle(payload)
    } finally {
      setBusy(false)
    }
  }

  async function onPaste(e) {
    const text = e.clipboardData.getData('text')
    if (!text?.trim()) return
    e.preventDefault()
    setBusy(true)
    try {
      await processText(text)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
      className={`rounded-md border border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--m-accent-soft)] ${
        compact ? 'px-4 py-5' : 'px-6 py-8'
      } ${className}`}
      style={{
        borderColor: dragging ? 'var(--m-accent)' : 'var(--m-border-strong)',
        background: dragging ? 'var(--m-accent-soft)' : 'var(--m-surface-2)',
      }}
    >
      <div className="text-center">
        <p
          className={`font-medium ${compact ? 'text-[13px]' : 'text-[14px]'}`}
          style={{ color: 'var(--m-text)' }}
        >
          {busy ? 'Reading…' : 'Drop or paste here'}
        </p>
        <p className={`mt-1 ${compact ? 'text-[11px]' : 'text-[12px]'}`} style={{ color: 'var(--m-muted)' }}>
          {hint}
        </p>
      </div>
    </div>
  )
}
