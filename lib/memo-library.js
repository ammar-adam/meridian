const LIBRARY_KEY = 'meridian_memo_library'

export function saveMemo(memoData, id) {
  const library = getMemoLibrary()
  const entryId = id ?? Date.now().toString()
  const entry = {
    id: entryId,
    companyName: memoData.COMPANY_NAME,
    round: memoData.ROUND,
    date: memoData.DATE,
    savedAt: new Date().toISOString(),
    data: memoData,
  }

  const existingIdx = library.findIndex(e => e.id === entryId)
  if (existingIdx >= 0) {
    library[existingIdx] = entry
  } else {
    library.unshift(entry)
  }

  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library.slice(0, 20)))
  return entryId
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
