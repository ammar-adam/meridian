'use client'

import { useEffect, useState } from 'react'
import { DEMO_LABEL, isDemoHost } from '@/lib/app-url'

export default function DemoEnvBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(isDemoHost(window.location.hostname))
  }, [])

  if (!show) return null

  return (
    <div
      className="border-b px-4 py-1.5 text-center text-[12px] font-medium tracking-wide"
      style={{
        borderColor: 'var(--m-border)',
        background: 'var(--m-surface)',
        color: 'var(--m-muted)',
      }}
    >
      {DEMO_LABEL}
      <span style={{ color: 'var(--m-muted-2)' }}> · data may reset · feedback build</span>
    </div>
  )
}
