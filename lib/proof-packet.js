/**
 * Proof packet — exportable diligence artifact: source, first-seen, index checks, brief link.
 */

import { buildDeepDiveLinks } from '@/lib/deep-dive-links'
import { companyToCrmRow } from '@/lib/crm-export'
import { resolveDiscoverCompanyUrl } from '@/lib/discover-url'

function indexChecksFor(company) {
  const checks = company?.checks
    || company?.indexChecks
    || company?.ledger?.indexChecks
    || []
  if (!Array.isArray(checks)) return []
  return checks.map(c => ({
    index: c.indexName || c.index || 'StartupHub',
    present: c.present,
    checkedAt: c.checkedAt || c.testedAt || null,
    detail: c.detail || c.result || null,
  }))
}

/**
 * Build a proof packet for one Flow / Discover company row.
 * @param {object} company
 * @param {{ origin?: string, fundName?: string, thesis?: string }} opts
 */
export function buildProofPacket(company, { origin = '', fundName = '', thesis = '' } = {}) {
  const c = company || {}
  const crm = companyToCrmRow(c)
  const briefUrl = resolveDiscoverCompanyUrl(c)
  const baseOrigin = origin || 'https://meridian-eight-sandy.vercel.app'

  const packet = {
    version: 1,
    generatedAt: new Date().toISOString(),
    company: {
      name: c.name || c.companyName || '',
      domain: crm.domain || null,
      website: crm.website || null,
      founders: crm.founders || null,
      stage: crm.stage || null,
      sector: crm.sector || null,
      geography: crm.geography || null,
      fitScore: c.fitScore ?? null,
    },
    provenance: {
      source: c.source || null,
      provenance: c.provenance || c.ledger?.provenance || null,
      cohortDate: c.cohortDate || c.coverage?.cohortDate || null,
      firstSeen: c.ledger?.firstSeen || c.firstSeenAt || crm.first_seen || null,
      meridianFirstSeen: c.ledger?.meridianFirstSeen || c.meridianFirstSeen || null,
    },
    coverage: c.coverage ? {
      status: c.coverage.status,
      label: c.coverage.label,
      detail: c.coverage.detail,
      falsifiableProof: c.coverage.falsifiableProof,
    } : null,
    verification: c.ledger?.verification ? {
      status: c.ledger.verification.status,
      label: c.ledger.verification.label,
      detail: c.ledger.verification.detail,
    } : null,
    indexChecks: indexChecksFor(c),
    reach: c.reach ? {
      directReach: c.reach.directReach,
      searchOnly: c.reach.searchOnly,
      primaryEmail: c.reach.primaryEmail,
      primaryLinkedIn: c.reach.primaryLinkedIn,
    } : null,
    serialFounder: c.serialFounder ? {
      priorCompanies: c.priorCompanies || [],
    } : null,
    mandate: fundName || thesis ? { fundName: fundName || null, thesis: thesis || null } : null,
    links: {
      brief: briefUrl ? `${baseOrigin}/brief?url=${encodeURIComponent(briefUrl)}` : null,
      flow: `${baseOrigin}/flow`,
      website: crm.website || null,
      deepDive: buildDeepDiveLinks(c),
    },
  }

  return packet
}

/** Plain-text proof packet for email / Affinity notes. */
export function proofPacketToText(packet) {
  const p = packet || {}
  const lines = [
    `Meridian proof packet — ${p.company?.name || 'Company'}`,
    p.generatedAt ? `Generated ${String(p.generatedAt).slice(0, 19)}Z` : null,
    '',
    p.company?.domain ? `Domain: ${p.company.domain}` : null,
    p.provenance?.source ? `Source: ${p.provenance.source}` : null,
    p.provenance?.provenance ? `Provenance: ${p.provenance.provenance}` : null,
    p.provenance?.firstSeen ? `First seen: ${p.provenance.firstSeen}` : null,
    p.coverage?.label ? `Coverage: ${p.coverage.label}` : null,
    p.verification?.label ? `Verification: ${p.verification.label}` : null,
  ].filter(v => v !== null)

  if (p.indexChecks?.length) {
    lines.push('', 'Index checks:')
    for (const check of p.indexChecks) {
      const hit = check.present === true ? 'present' : check.present === false ? 'miss' : 'unknown'
      lines.push(`  · ${check.index}: ${hit}${check.checkedAt ? ` (${String(check.checkedAt).slice(0, 10)})` : ''}`)
    }
  }

  if (p.reach?.directReach) {
    lines.push('', 'Reach: direct (verified email or LinkedIn profile)')
    if (p.reach.primaryEmail) lines.push(`  Email: ${p.reach.primaryEmail}`)
    if (p.reach.primaryLinkedIn) lines.push(`  LinkedIn: ${p.reach.primaryLinkedIn}`)
  } else if (p.reach?.searchOnly) {
    lines.push('', 'Reach: LinkedIn search only (not counted in direct-reach rate)')
  }

  if (p.serialFounder?.priorCompanies?.length) {
    lines.push('', `Serial founder — prior: ${p.serialFounder.priorCompanies.join(', ')}`)
  }

  if (p.links?.brief) lines.push('', `Brief: ${p.links.brief}`)
  if (p.links?.deepDive?.google) lines.push(`Google: ${p.links.deepDive.google}`)

  lines.push('', 'Exported from Meridian — falsifiable where dated checks exist.')
  return lines.join('\n')
}
