/**
 * Freshness ledger — the verifiable exclusivity signal.
 *
 * "Before Harmonic" is only credible if a GP can check it. This ledger records,
 * per company, an honest and checkable set of facts:
 *   - firstSeen: the community cohort announcement date (cited via provenance)
 *   - source: which community surfaced it (Velocity / DMZ / CDL / grant)
 *   - indexTest: whether we ran a falsifiable search against a public index
 *       'verified_miss' = we searched StartupHub by name and it returned no match
 *       'not_tested'    = community-sourced, we have NOT claimed index absence
 *   - stageSignal: stage inferred from the program (honest, not invented traction)
 *
 * We never fabricate a "days before Harmonic" number we cannot back. Where we
 * ran the falsifiable test (docs/falsifiable-test-results.md) we say so; where
 * we did not, we say "community-sourced — verify against your index".
 */

/** Companies we actually searched in StartupHub and confirmed no name match. */
const INDEX_TEST_REGISTRY = {
  scadable: { index: 'StartupHub', result: 'no name match', testedAt: '2026-07-20' },
  simantic: { index: 'StartupHub', result: 'no name match', testedAt: '2026-07-20' },
  'photon-iv': { index: 'StartupHub', result: 'no name match', testedAt: '2026-07-20' },
  'photon iv': { index: 'StartupHub', result: 'no name match', testedAt: '2026-07-20' },
}

/** Program → honest stage signal. Cohorts imply stage; we do not invent rounds. */
const PROGRAM_STAGE = {
  velocity: { stage: 'pre-seed', note: 'Velocity (UWaterloo) — student/early founders' },
  dmz: { stage: 'pre-seed / seed', note: 'DMZ (TMU) incubator + pre-incubator' },
  cdl: { stage: 'seed / Series A', note: 'CDL — later, science/deep-tech cohorts' },
}

function normName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ')
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

/** Build a single ledger entry. Pure, safe on server + client. */
export function buildLedgerEntry(company) {
  const name = normName(company?.name || company?.companyName)
  const firstSeen = company?.cohortDate || company?.sourceMeta?.cohortDate || company?.firstSeenAt || null
  const program = programFrom(company)
  const indexTest = INDEX_TEST_REGISTRY[name] || null
  const stage = company?.stage
    || (program && PROGRAM_STAGE[program]?.stage)
    || null

  const ageDays = daysSince(firstSeen)
  const source = company?.source || null
  const isCommunity = source === 'incubator' || source === 'grant' || source === 'event_host'

  let verification
  if (indexTest) {
    verification = {
      status: 'verified_miss',
      label: `Not in ${indexTest.index}`,
      detail: `Name search returned no match (${indexTest.testedAt}). First seen in ${company?.provenance || 'community cohort'}.`,
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
      detail: 'Surfaced from a community cohort. Verify against your own index — we have not asserted absence.',
      checkable: true,
    }
  } else {
    verification = {
      status: 'public',
      label: 'Public index',
      detail: 'Also findable on public indexes.',
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
    checkableShare: list.length ? (verifiedMiss + communitySourced) / list.length : 0,
  }
}
