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

/**
 * Turn a Deal Flow / Discover row into a CRM-ready record.
 * Includes the wedge signals a GP wants in Affinity: source, first-seen,
 * stage, coverage status, founder reach.
 */
export function companyToCrmRow(company) {
  const c = company || {}
  const domain = c.domain || (c.url || '').replace(/^https?:\/\//, '').split('/')[0] || ''
  const founders = c.personName || (c.reach?.founders || []).map(f => f.name).join(', ')
  const email = c.reach?.primaryEmail || ''
  const linkedin = c.reach?.primaryLinkedIn || ''
  const firstSeen = c.ledger?.firstSeen || c.cohortDate || ''
  const coverage = c.ledger?.verification?.label || c.coverage?.label || ''
  return {
    company: c.name || c.companyName || '',
    domain,
    website: domain ? `https://${domain}` : '',
    founders,
    email,
    linkedin,
    stage: c.stage || c.ledger?.stageSignal || '',
    sector: c.sector || '',
    geography: c.geography || '',
    source: c.source || '',
    provenance: c.provenance || c.ledger?.provenance || '',
    first_seen: firstSeen,
    coverage,
    fit_score: c.fitScore ?? '',
  }
}

export function companyToCrmText(company) {
  const r = companyToCrmRow(company)
  const lines = [
    `${r.company}${r.domain ? ` (${r.domain})` : ''}`,
    r.founders ? `Founders: ${r.founders}` : null,
    r.email ? `Email: ${r.email}` : null,
    r.linkedin ? `LinkedIn: ${r.linkedin}` : null,
    r.stage ? `Stage: ${r.stage}` : null,
    [r.sector, r.geography].filter(Boolean).length ? `${[r.sector, r.geography].filter(Boolean).join(' · ')}` : null,
    r.source ? `Source: ${r.source}${r.provenance ? ` — ${r.provenance}` : ''}` : null,
    r.first_seen ? `First seen: ${r.first_seen}` : null,
    r.coverage ? `Coverage: ${r.coverage}` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

export async function copyCompanyForCrm(company) {
  const text = companyToCrmText(company)
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
