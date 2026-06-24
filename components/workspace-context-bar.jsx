'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getWorkspaceSnapshot } from '@/lib/workspace-snapshot'

export default function WorkspaceContextBar() {
  const [snap, setSnap] = useState(null)

  useEffect(() => {
    setSnap(getWorkspaceSnapshot())
    const onFocus = () => setSnap(getWorkspaceSnapshot())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  if (!snap) return null

  const chips = []

  if (snap.lastThesis) {
    chips.push({
      key: 'thesis',
      label: snap.strategyName ? `Search · ${snap.strategyName}` : 'Active search',
      value: snap.lastThesis.length > 48 ? `${snap.lastThesis.slice(0, 48)}…` : snap.lastThesis,
      href: '/discover',
      meta: snap.lastSearchCount ? `${snap.lastSearchCount} companies` : null,
    })
  }

  if (snap.briefCount > 0) {
    chips.push({
      key: 'library',
      label: 'Library',
      value: `${snap.briefCount} brief${snap.briefCount !== 1 ? 's' : ''}`,
      href: '/library',
      meta: snap.pendingReview > 0 ? `${snap.pendingReview} need review` : null,
      warn: snap.pendingReview > 0,
    })
  }

  if (snap.reviewedCount > 0) {
    chips.push({
      key: 'reviewed',
      label: 'Reviewed',
      value: `${snap.reviewedCount} total`,
      href: '/thesis',
      meta: snap.pursueCount > 0 ? `${snap.pursueCount} pursue` : null,
    })
  }

  if (!chips.length) return null

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b px-6 py-2"
      style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}
    >
      {chips.map(chip => (
        <Link
          key={chip.key + chip.label}
          href={chip.href}
          className="m-context-chip group"
          data-warn={chip.warn || undefined}
        >
          <span className="m-context-chip-label">{chip.label}</span>
          <span className="m-context-chip-value">{chip.value}</span>
          {chip.meta && (
            <span className={`m-context-chip-meta ${chip.warn ? 'm-context-chip-warn' : ''}`}>
              {chip.meta}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
