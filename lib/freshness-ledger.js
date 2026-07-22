/**
 * Freshness ledger — the verifiable exclusivity signal.
 *
 * "Before Harmonic" is only credible if a GP can check it. This ledger records,
 * per company, an honest and checkable set of facts:
 *   - firstSeen: the community cohort announcement date (cited via provenance)
 *   - source: which community surfaced it (Velocity / DMZ / CDL / grant)
 *   - indexTest: whether we ran a falsifiable search against a public index
 *       'verified_miss' = a dated check with present=false exists
 *       'community_sourced' / 'signal_based' / 'unknown' — NEVER verified_miss without a check
 *   - stageSignal: stage inferred from the program (honest, not invented traction)
 *
 * Verification status derives ONLY from an indexTest / checks array on the
 * company object (from server-side index_checks). There is no hardcoded name list.
 */

/** Program → honest stage signal. Cohorts imply stage; we do not invent rounds. */
const PROGRAM_STAGE = {
  velocity: { stage: 'pre-seed', note: 'Velocity (UWaterloo) — student/early founders' },
  dmz: { stage: 'pre-seed / seed', note: 'DMZ (TMU) incubator + pre-incubator' },
  cdl: { stage: 'seed / Series A', note: 'CDL — later, science/deep-tech cohorts' },
}

function programFrom(company) {
  const p = company?.sourceMeta?.program
  if (p) return p
  const prov = company?.provenance || ''
  if (/velocity/i.test(prov)) return 'velocity'
  if (/dmz/i.test(prov)) return 'dmz'
  if (/cdl/i.test(prov)) return 'cdl'
  return null
}

export function daysSince(iso) {
  const t = Date.parse(iso || '')
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24))
}

/**
 * Resolve a dated index check from company props.
 * Accepts indexTest object, or checks / indexChecks arrays from the truth ledger.
 * Returns null when no check exists — never invents a miss.
 */
export function resolveIndexTest(company) {
  const direct = company?.indexTest
  if (direct && (direct.index || direct.indexName) && (direct.testedAt || direct.checkedAt || direct.present === false || direct.present === true || direct.result)) {
    const present = direct.present === true
      ? true
      : direct.present === false || /no\s*name\s*match/i.test(direct.result || '')
        ? false
        : direct.present
    return {
      index: direct.index || direct.indexName || 'StartupHub',
      result: direct.result || (present === false ? 'no name match' : present === true ? 'name match' : null),
      testedAt: String(direct.testedAt || direct.checkedAt || '').slice(0, 10) || null,
      present,
    }
  }

  const checks = company?.checks || company?.indexChecks || company?.ledger?.indexChecks || null
  if (!Array.isArray(checks) || !checks.length) return null

  const miss = checks.find(c => c.present === false)
  if (miss) {
    return {
      index: miss.indexName || miss.index || 'StartupHub',
      result: miss.detail || 'no name match',
      testedAt: String(miss.checkedAt || miss.testedAt || '').slice(0, 10) || null,
      present: false,
    }
  }

  const hit = checks.find(c => c.present === true)
  if (hit) {
    return {
      index: hit.indexName || hit.index || 'StartupHub',
      result: hit.detail || 'name match',
      testedAt: String(hit.checkedAt || hit.testedAt || '').slice(0, 10) || null,
      present: true,
    }
  }

  return null
}

/** Build a single ledger entry. Pure, safe on server + client. */
export function buildLedgerEntry(company) {
  const firstSeen = company?.cohortDate || company?.sourceMeta?.cohortDate || company?.firstSeenAt || null
  const program = programFrom(company)
  const indexTest = resolveIndexTest(company)
  const stage = company?.stage
    || (program && PROGRAM_STAGE[program]?.stage)
    || null

  const ageDays = daysSince(firstSeen)
  const source = company?.source || null
  const isCommunity = source === 'incubator' || source === 'grant' || source === 'event_host'

  let verification
  if (indexTest && indexTest.present === false) {
    verification = {
      status: 'verified_miss',
      label: `Not in ${indexTest.index}`,
      detail: `Name search returned no match (${indexTest.testedAt || 'dated check'}). First seen in ${company?.provenance || 'community cohort'}.`,
      checkable: true,
    }
  } else if (indexTest && indexTest.present === true) {
    verification = {
      status: 'index_present',
      label: `Also in ${indexTest.index}`,
      detail: `Name search matched (${indexTest.testedAt || 'dated check'}).`,
      checkable: true,
    }
  } else if (source === 'domain_registry') {
    verification = {
      status: 'signal_based',
      label: 'Pre-announcement signal',
      detail: 'New incorporation + live domain. Not from any announcement, cohort, or index — the earliest signal class we track.',
      checkable: true,
    }
  } else if (isCommunity) {
    verification = {
      status: 'community_sourced',
      label: 'Community-sourced',
      detail: 'Surfaced from a community cohort. Index presence not yet checked — we have not asserted absence.',
      checkable: false,
    }
  } else {
    verification = {
      status: 'unknown',
      label: 'Unverified',
      detail: 'No dated index check on record.',
      checkable: false,
    }
  }

  return {
    name: company?.name || company?.companyName || null,
    domain: company?.domain || null,
    firstSeen,
    ageDays,
    freshLabel: ageDays == null ? null : ageDays <= 120 ? 'fresh' : ageDays <= 365 ? 'recent' : 'aging',
    program,
    programNote: program ? PROGRAM_STAGE[program]?.note : null,
    source,
    provenance: company?.provenance || null,
    stageSignal: stage,
    indexTest,
    verification,
  }
}

export function annotateLedger(companies = []) {
  return companies.map((c) => {
    const ledger = buildLedgerEntry(c)
    return {
      ...c,
      stage: c.stage || ledger.stageSignal || c.stage,
      firstSeenAt: ledger.firstSeen || c.firstSeenAt || null,
      ledger,
    }
  })
}

export function ledgerSummary(companies = []) {
  const list = companies || []
  const verifiedMiss = list.filter(c => c.ledger?.verification?.status === 'verified_miss').length
  const communitySourced = list.filter(c => c.ledger?.verification?.status === 'community_sourced').length
  const withFirstSeen = list.filter(c => c.ledger?.firstSeen).length
  const fresh = list.filter(c => c.ledger?.freshLabel === 'fresh').length
  const withStage = list.filter(c => c.ledger?.stageSignal).length
  const ages = list.map(c => c.ledger?.ageDays).filter(n => n != null)
  const medianAge = ages.length
    ? ages.sort((a, b) => a - b)[Math.floor(ages.length / 2)]
    : null
  return {
    total: list.length,
    verifiedMiss,
    communitySourced,
    withFirstSeen,
    fresh,
    withStage,
    medianAgeDays: medianAge,
    checkableShare: list.length ? verifiedMiss / list.length : 0,
  }
}
