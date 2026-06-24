'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef } from 'react'
import {
  exportLocalWorkspace,
  hydrateLocalWorkspace,
  hasLocalData,
} from '@/lib/workspace-local'

const SYNC_DEBOUNCE_MS = 2000

export default function WorkspaceSync() {
  const { isSignedIn, isLoaded } = useAuth()
  const timerRef = useRef(null)
  const syncedRef = useRef(false)

  const pushToCloud = useCallback(async () => {
    if (!isSignedIn) return
    const payload = exportLocalWorkspace()
    try {
      await fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      // offline — local cache remains source of truth
    }
  }, [isSignedIn])

  const pullFromCloud = useCallback(async () => {
    if (!isSignedIn) return
    try {
      const res = await fetch('/api/workspace')
      if (res.status === 503) return
      if (!res.ok) return

      const data = await res.json()
      const serverHasData =
        data.fundsStore?.funds?.length ||
        data.memos?.length ||
        data.edits?.length

      if (serverHasData) {
        hydrateLocalWorkspace(data)
        return
      }

      if (hasLocalData()) {
        await pushToCloud()
      }
    } catch {
      // ignore
    }
  }, [isSignedIn, pushToCloud])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      syncedRef.current = false
      return
    }
    if (syncedRef.current) return
    syncedRef.current = true
    pullFromCloud()
  }, [isLoaded, isSignedIn, pullFromCloud])

  useEffect(() => {
    if (!isSignedIn) return

    function schedulePush() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => pushToCloud(), SYNC_DEBOUNCE_MS)
    }

    window.addEventListener('meridian-sync-needed', schedulePush)
    window.addEventListener('meridian-context-change', schedulePush)
    return () => {
      window.removeEventListener('meridian-sync-needed', schedulePush)
      window.removeEventListener('meridian-context-change', schedulePush)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isSignedIn, pushToCloud])

  return null
}
