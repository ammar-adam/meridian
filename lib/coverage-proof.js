/**
 * Coverage proof — the data wedge made visible.
 *
 * Harmonic / PitchBook / Crunchbase index companies after they are publicly
 * findable. Meridian's incubator cohorts are community-first. We never pretend
 * to call Harmonic's API; we label honestly:
 *   - community_first: incubator/grant provenance, typically pre-index
 *   - also_public: known widely indexed names (contrast set)
 *   - unverified_index: insufficient signal to claim either
 */

/** Widely indexed names used as contrast — not Meridian's wedge. */
const ALSO_PUBLIC_NAMES = new Set([
  'cohere', 'ada', 'hopper', 'neo financial', 'vention', 'shopify',
  'wealthsimple', 'applyboard', 'affinity', 'clearbanc', 'clearco',
])

/** Companies that passed Meridian vs StartupHub falsifiable test (community-only). */
const COMMUNITY_PROOF_NAMES = new Set([
  'scadable', 'simantic', 'photon-iv', 'photon iv',
])

function normName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * @param {object} company — Discover/Flow company seed
 * @returns {object} coverage annotation
 */
export function buildCoverageProof(company) {
  const name = normName(company?.name || company?.companyName)
  const source = company?.source || ''
  const cohortDate = company?.cohortDate || company?.sourceMeta?.cohortDate || null
  const provenance = company?.provenance || null
  const program = company?.sourceMeta?.program
    || (typeof provenance === 'string' && provenance.includes('Velocity') ? 'velocity'
      : provenance?.includes('DMZ') ? 'dmz'
        : provenance?.includes('CDL') ? 'cdl' : null)

  const isCommunitySource = source === 'incubator' || source === 'grant' || source === 'event_host'
  const alsoPublic = ALSO_PUBLIC_NAMES.has(name)
  const falsifiableProof = COMMUNITY_PROOF_NAMES.has(name)

  let status = 'unverified_index'
  let label = 'Coverage unknown'
  let detail = 'Not enough signal to claim exclusivity.'

  if (alsoPublic) {
    status = 'also_public'
    label = 'Also on public indexes'
    detail = 'Findable on Harmonic / Crunchbase-class tools — not Meridian’s wedge.'
  } else if (isCommunitySource || falsifiableProof) {
    status = 'community_first'
    label = falsifiableProof ? 'Community-only · StartupHub miss' : 'Before public indexes'
    detail = falsifiableProof
      ? 'Falsifiable test: Meridian had founders+domain; StartupHub name-search returned no match.'
      : 'Sourced from incubator/grant community materials — typically before Harmonic indexes.'
  }

  return {
    status,
    label,
    detail,
    source: source || null,
    program,
    cohortDate,
    provenance,
    firstSeenAt: cohortDate || company?.firstSeenAt || null,
    falsifiableProof,
    notInHarmonicLikely: status === 'community_first',
  }
}

export function annotateCoverage(companies = []) {
  return companies.map((c) => {
    const coverage = buildCoverageProof(c)
    return {
      ...c,
      cohortDate: coverage.cohortDate || c.cohortDate || null,
      firstSeenAt: coverage.firstSeenAt,
      coverage,
      notInHarmonicLikely: coverage.notInHarmonicLikely,
    }
  })
}

export function coverageSummary(companies = []) {
  const list = companies || []
  const communityFirst = list.filter(c => c.coverage?.status === 'community_first').length
  const alsoPublic = list.filter(c => c.coverage?.status === 'also_public').length
  const withCohort = list.filter(c => c.cohortDate || c.coverage?.cohortDate).length
  return {
    total: list.length,
    communityFirst,
    alsoPublic,
    withCohort,
    communityShare: list.length ? communityFirst / list.length : 0,
  }
}
