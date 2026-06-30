import { getMemoLibrary } from '@/lib/memo-library'
import { memoToShareText } from '@/lib/memo-export'

function csvCell(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

function reviewOutcome(entry) {
  if (entry.outcome) return entry.outcome
  if (entry.gpOutcome) return `gp:${entry.gpOutcome}`
  return 'pending'
}

function shareLinkForEntry(entry, origin) {
  if (!entry.lastShareId) return ''
  return origin ? `${origin}/share/${entry.lastShareId}` : entry.lastShareId
}

/** Export library rows for CRM / Clay / Affinity spreadsheet import */
export function libraryToCsv(entries = null, { origin = '' } = {}) {
  const rows = entries ?? getMemoLibrary()
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  const header = [
    'company',
    'domain',
    'round',
    'outcome',
    'review_outcome',
    'fund',
    'thesis_headline',
    'quality_passed',
    'quality_warn_count',
    'saved_at',
    'meridian_link',
    'share_link',
    'company_url',
  ]
  const lines = [header.join(',')]

  for (const e of rows) {
    const domain = e.companyDomain || ''
    lines.push([
      csvCell(e.companyName),
      csvCell(domain),
      csvCell(e.round),
      csvCell(e.outcome || 'pending'),
      csvCell(reviewOutcome(e)),
      csvCell(e.fundName),
      csvCell(stripHtml(e.data?.THESIS_HEADLINE)),
      csvCell(e.qualityPassed === true ? 'yes' : e.qualityPassed === false ? 'no' : ''),
      csvCell(e.qualityWarnCount ?? ''),
      csvCell(e.savedAt?.slice(0, 10)),
      csvCell(baseOrigin ? `${baseOrigin}/memo?id=${e.id}` : e.id),
      csvCell(shareLinkForEntry(e, baseOrigin)),
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

/** Plain-text row for pasting into Affinity notes, HubSpot, or email */
export function libraryRowToCrmText(entry) {
  if (!entry?.data) return ''
  return memoToShareText(entry.data, {
    outcome: entry.outcome || entry.gpOutcome,
    editCount: entry.editCount,
  })
}

export async function copyLibraryRowForCrm(entry) {
  const text = libraryRowToCrmText(entry)
  await navigator.clipboard.writeText(text)
  return text
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
