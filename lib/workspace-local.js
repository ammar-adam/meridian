import { mergeEditLogs, mergeMemoLibraries, reconcileLibraryOutcomes } from '@/lib/outcome-sync'
import { getTeamContext, setTeamContext } from '@/lib/team-workspace'

const FUNDS_STORE_KEY = 'meridian_funds_store'
const LIBRARY_KEY = 'meridian_memo_library'
const EDITS_KEY = 'meridian_edit_log'

export function exportLocalWorkspace() {
  if (typeof window === 'undefined') return { fundsStore: null, memos: [], edits: [], teamContext: null }

  let fundsStore = null
  let memos = []
  let edits = []

  try {
    const raw = localStorage.getItem(FUNDS_STORE_KEY)
    if (raw) fundsStore = JSON.parse(raw)
  } catch { /* ignore */ }

  try {
    memos = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '[]')
  } catch { /* ignore */ }

  try {
    edits = JSON.parse(localStorage.getItem(EDITS_KEY) ?? '[]')
  } catch { /* ignore */ }

  return { fundsStore, memos, edits, teamContext: getTeamContext() }
}

export function hydrateLocalWorkspace({ fundsStore, memos, edits, teamContext }) {
  if (typeof window === 'undefined') return

  const local = exportLocalWorkspace()

  if (fundsStore) {
    localStorage.setItem(FUNDS_STORE_KEY, JSON.stringify(fundsStore))
  }

  if (Array.isArray(memos)) {
    const merged = mergeMemoLibraries(local.memos, memos).slice(0, 200)
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(merged))
  }

  if (Array.isArray(edits)) {
    const merged = mergeEditLogs(local.edits, edits).slice(0, 500)
    localStorage.setItem(EDITS_KEY, JSON.stringify(merged))
  }

  if (teamContext?.teamId) {
    setTeamContext(teamContext)
  }

  reconcileLibraryOutcomes()

  window.dispatchEvent(new Event('meridian-context-change'))
  window.dispatchEvent(new Event('meridian-sync-complete'))
}

export function hasLocalData() {
  const { fundsStore, memos, edits } = exportLocalWorkspace()
  return Boolean(
    fundsStore?.funds?.length ||
    memos.length ||
    edits.length
  )
}

export function notifySyncNeeded() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('meridian-sync-needed'))
}
