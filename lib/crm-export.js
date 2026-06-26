import { getMemoLibrary } from '@/lib/memo-library'

function csvCell(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Export library rows for CRM / Clay / spreadsheet import */
export function libraryToCsv(entries = null) {
  const rows = entries ?? getMemoLibrary()
  const header = ['company', 'domain', 'round', 'outcome', 'fund', 'saved_at', 'meridian_link', 'company_url']
  const lines = [header.join(',')]

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  for (const e of rows) {
    const domain = e.companyDomain || ''
    lines.push([
      csvCell(e.companyName),
      csvCell(domain),
      csvCell(e.round),
      csvCell(e.outcome || 'pending'),
      csvCell(e.fundName),
      csvCell(e.savedAt?.slice(0, 10)),
      csvCell(origin ? `${origin}/memo?id=${e.id}` : e.id),
      csvCell(domain ? `https://${domain}` : ''),
    ].join(','))
  }

  return lines.join('\n')
}

export function downloadLibraryCsv(filename = 'meridian-briefs.csv', entries = null) {
  const csv = libraryToCsv(entries)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function batchResultsToCsv(results, origin = '') {
  const header = ['company', 'domain', 'status', 'error', 'meridian_link', 'source_url']
  const lines = [header.join(',')]
  for (const r of results) {
    lines.push([
      csvCell(r.companyName || r.domain),
      csvCell(r.domain),
      csvCell(r.status),
      csvCell(r.error),
      csvCell(r.memoId && origin ? `${origin}/memo?id=${r.memoId}` : ''),
      csvCell(r.url),
    ].join(','))
  }
  return lines.join('\n')
}
