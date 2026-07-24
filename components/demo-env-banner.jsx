'use client'

import { useEffect, useState } from 'react'
import { isDemoHost } from '@/lib/app-url'

export default function DemoEnvBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(isDemoHost(window.location.hostname))
  }, [])

  if (!show) return null

  return (
    <div
      className="border-b px-4 py-1.5 text-center text-[11px] font-medium"
      style={{
        borderColor: 'var(--m-border)',
        background: 'var(--m-surface-2)',
        color: 'var(--m-muted)',
      }}
    >
      Demo environment · data may reset ·{' '}
      <span style={{ color: 'var(--m-accent)' }}>meridian-mentor</span>
    </div>
  )
}
