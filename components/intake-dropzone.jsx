'use client'

import { useCallback, useState } from 'react'
import { parseIntakeFile, parseIntakeText } from '@/lib/intake-parser'

export default function IntakeDropzone({
  onIntake,
  accept = '.csv,.txt,.vcf,text/plain',
  hint = 'Drop a file, paste a URL, portfolio CSV, or contact export',
  compact = false,
  variant = 'default',
  className = '',
}) {
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const isLanding = variant === 'landing'

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

  const idleBorder = isLanding ? 'var(--ml-line-strong)' : 'var(--m-border-strong)'
  const idleBg = isLanding ? 'var(--ml-panel)' : 'var(--m-surface-2)'
  const dragBorder = isLanding ? 'var(--ml-accent)' : 'var(--m-accent)'
  const dragBg = isLanding ? 'rgba(159, 227, 192, 0.1)' : 'var(--m-accent-soft)'
  const titleColor = isLanding ? 'var(--ml-text)' : 'var(--m-text)'
  const hintColor = isLanding ? 'var(--ml-muted)' : 'var(--m-muted)'

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
      className={`rounded-lg border border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--m-accent-soft)] ${
        compact ? 'px-4 py-5' : 'px-6 py-8'
      } ${className}`}
      style={{
        borderColor: dragging ? dragBorder : idleBorder,
        background: dragging ? dragBg : idleBg,
      }}
    >
      <div className="text-center">
        <p
          className={`font-medium ${compact ? 'text-[13px]' : 'text-[14px]'}`}
          style={{ color: titleColor }}
        >
          {busy ? 'Reading…' : 'Drop or paste here'}
        </p>
        <p className={`mt-1 ${compact ? 'text-[11px]' : 'text-[12px]'}`} style={{ color: hintColor }}>
          {hint}
        </p>
      </div>
    </div>
  )
}
