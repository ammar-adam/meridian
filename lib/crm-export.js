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
function indexCheckSummary(company) {
  const checks = company?.checks || company?.indexChecks || company?.ledger?.indexChecks || []
  if (!Array.isArray(checks) || !checks.length) return ''
  return checks.map(c => {
    const idx = c.indexName || c.index || 'index'
    const hit = c.present === true ? 'present' : c.present === false ? 'miss' : '?'
    const at = String(c.checkedAt || c.testedAt || '').slice(0, 10)
    return `${idx}:${hit}${at ? `@${at}` : ''}`
  }).join('; ')
}

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
    coverage_status: c.coverage?.status || c.ledger?.verification?.status || '',
    index_checks: indexCheckSummary(c),
    direct_reach: c.reach?.directReach ? 'yes' : c.reach?.searchOnly ? 'linkedin_search' : 'no',
    serial_founder: c.serialFounder ? 'yes' : '',
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
    r.index_checks ? `Index checks: ${r.index_checks}` : null,
    r.direct_reach && r.direct_reach !== 'no' ? `Reach: ${r.direct_reach}` : null,
    r.serial_founder ? 'Serial founder' : null,
  ].filter(Boolean)
  return lines.join('\n')
}

/** Affinity-ready CSV export for Flow / Discover company rows. */
export function flowCompaniesToCsv(companies = [], { origin = '' } = {}) {
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  const header = [
    'company',
    'domain',
    'website',
    'founders',
    'email',
    'linkedin',
    'stage',
    'sector',
    'geography',
    'source',
    'provenance',
    'first_seen',
    'coverage',
    'coverage_status',
    'index_checks',
    'direct_reach',
    'serial_founder',
    'fit_score',
    'meridian_brief_link',
  ]
  const lines = [header.join(',')]

  for (const c of companies || []) {
    const r = companyToCrmRow(c)
    const briefUrl = r.domain ? `${baseOrigin}/brief?url=${encodeURIComponent(`https://${r.domain}`)}` : ''
    lines.push([
      csvCell(r.company),
      csvCell(r.domain),
      csvCell(r.website),
      csvCell(r.founders),
      csvCell(r.email),
      csvCell(r.linkedin),
      csvCell(r.stage),
      csvCell(r.sector),
      csvCell(r.geography),
      csvCell(r.source),
      csvCell(r.provenance),
      csvCell(r.first_seen),
      csvCell(r.coverage),
      csvCell(r.coverage_status),
      csvCell(r.index_checks),
      csvCell(r.direct_reach),
      csvCell(r.serial_founder),
      csvCell(r.fit_score),
      csvCell(briefUrl),
    ].join(','))
  }

  return lines.join('\n')
}

export function downloadFlowCsv(companies, filename = 'meridian-flow-export.csv') {
  const csv = flowCompaniesToCsv(companies)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
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
