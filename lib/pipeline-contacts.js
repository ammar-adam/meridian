import { extractDomain, normalizeUrl } from '@/lib/url-utils'

const KEY = 'meridian_pipeline'

function normalizeRow(row) {
  const url = row.url || (row.domain ? normalizeUrl(row.domain) : '')
  const domain = row.domain || extractDomain(url)
  return {
    id: row.id || `${domain || row.name}_${Date.now()}`,
    name: row.name?.trim() || domain || 'Unknown',
    domain,
    url,
    description: row.description?.trim() || '',
    source: row.source || 'import',
    importedAt: row.importedAt || new Date().toISOString(),
  }
}

export function getPipelineContacts() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function importPipelineContacts(rows, { merge = true } = {}) {
  const incoming = rows.map(normalizeRow).filter(r => r.name || r.domain)
  const existing = merge ? getPipelineContacts() : []
  const seen = new Set(existing.map(r => r.domain || r.name.toLowerCase()))

  const added = []
  for (const row of incoming) {
    const key = row.domain || row.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    added.push(row)
  }

  const next = [...added, ...existing].slice(0, 200)
  localStorage.setItem(KEY, JSON.stringify(next))
  return { added: added.length, total: next.length }
}

export function removePipelineContact(id) {
  const next = getPipelineContacts().filter(r => r.id !== id)
  localStorage.setItem(KEY, JSON.stringify(next))
}
