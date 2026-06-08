const LIBRARY_KEY = 'meridian_memo_library'

export function saveMemo(memoData) {
  const library = getMemoLibrary()
  const entry = {
    id: Date.now().toString(),
    companyName: memoData.COMPANY_NAME,
    round: memoData.ROUND,
    date: memoData.DATE,
    savedAt: new Date().toISOString(),
    data: memoData,
  }
  library.unshift(entry)
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library.slice(0, 20)))
  return entry.id
}

export function getMemoLibrary() {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getMemoById(id) {
  return getMemoLibrary().find(e => e.id === id) ?? null
}
