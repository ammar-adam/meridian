const FUNDS_STORE_KEY = 'meridian_funds_store'
const LIBRARY_KEY = 'meridian_memo_library'
const EDITS_KEY = 'meridian_edit_log'

export function exportLocalWorkspace() {
  if (typeof window === 'undefined') return { fundsStore: null, memos: [], edits: [] }

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

  return { fundsStore, memos, edits }
}

export function hydrateLocalWorkspace({ fundsStore, memos, edits }) {
  if (typeof window === 'undefined') return

  if (fundsStore) {
    localStorage.setItem(FUNDS_STORE_KEY, JSON.stringify(fundsStore))
  }
  if (Array.isArray(memos)) {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(memos.slice(0, 50)))
  }
  if (Array.isArray(edits)) {
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits.slice(0, 500)))
  }

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
