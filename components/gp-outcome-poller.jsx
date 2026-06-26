'use client'

import { useEffect } from 'react'
import { getMemoLibrary } from '@/lib/memo-library'
import { syncShareOutcomesFromServer } from '@/lib/outcome-sync'

const POLL_MS = 60_000

export default function GpOutcomePoller() {
  useEffect(() => {
    async function poll() {
      const pending = getMemoLibrary().some(e => e.lastShareId && !e.gpOutcome)
      if (!pending) return
      const synced = await syncShareOutcomesFromServer()
      if (synced > 0) {
        window.dispatchEvent(new Event('meridian-context-change'))
      }
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
