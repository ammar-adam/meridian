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

/** Merge cloud + local fund stores so a thin cloud payload cannot wipe demo seeds. */
export function mergeFundsStores(local, remote) {
  if (!remote) return local || null
  if (!local?.funds?.length) return remote
  if (!remote.funds?.length) return local

  const byId = new Map()
  for (const f of local.funds || []) {
    if (f?.id) byId.set(f.id, f)
  }
  for (const f of remote.funds || []) {
    if (!f?.id) continue
    const existing = byId.get(f.id)
    if (!existing) {
      byId.set(f.id, f)
      continue
    }
    const localTs = Date.parse(existing.updatedAt || 0) || 0
    const remoteTs = Date.parse(f.updatedAt || 0) || 0
    // Prefer the newer profile; on ties keep local (user's live session).
    byId.set(f.id, remoteTs > localTs ? f : existing)
  }

  const funds = [...byId.values()]
  const preferLocal = local.activeFundId && funds.some(f => f.id === local.activeFundId)
  const preferRemote = remote.activeFundId && funds.some(f => f.id === remote.activeFundId)
  const activeFundId = preferLocal
    ? local.activeFundId
    : preferRemote
      ? remote.activeFundId
      : funds[0]?.id || null

  return { funds, activeFundId }
}

export function hydrateLocalWorkspace({ fundsStore, memos, edits, teamContext }) {
  if (typeof window === 'undefined') return

  const local = exportLocalWorkspace()

  if (fundsStore) {
    const merged = mergeFundsStores(local.fundsStore, fundsStore)
    if (merged) localStorage.setItem(FUNDS_STORE_KEY, JSON.stringify(merged))
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
