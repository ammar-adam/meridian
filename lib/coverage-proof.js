/**
 * Coverage proof — the data wedge made visible.
 *
 * Harmonic / PitchBook / Crunchbase index companies after they are publicly
 * findable. Meridian's incubator cohorts are community-sourced. We never pretend
 * to call Harmonic's API; we label honestly:
 *   - community_first: dated index check with present=false (verified miss)
 *   - community_sourced: incubator/grant/event provenance, no check yet
 *   - also_public: known widely indexed names (contrast set)
 *   - unverified_index: insufficient signal to claim either
 *
 * community_first / "Before public indexes" is NEVER auto-set without a check.
 */

/** Widely indexed names used as contrast — not Meridian's wedge. */
const ALSO_PUBLIC_NAMES = new Set([
  'cohere', 'ada', 'hopper', 'neo financial', 'vention', 'shopify',
  'wealthsimple', 'applyboard', 'affinity', 'clearbanc', 'clearco',
])

function normName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Pull a dated miss check from company props (same shape as freshness-ledger). */
function resolveMissCheck(company) {
  const direct = company?.indexTest
  if (direct) {
    const present = direct.present === true
      ? true
      : direct.present === false || /no\s*name\s*match/i.test(direct.result || '')
        ? false
        : direct.present
    if (present === false) {
      return {
        index: direct.index || direct.indexName || 'StartupHub',
        testedAt: String(direct.testedAt || direct.checkedAt || '').slice(0, 10) || null,
      }
    }
    if (present === true) return null
  }

  const checks = company?.checks || company?.indexChecks || company?.ledger?.indexChecks || null
  if (!Array.isArray(checks) || !checks.length) return null
  const miss = checks.find(c => c.present === false)
  if (!miss) return null
  return {
    index: miss.indexName || miss.index || 'StartupHub',
    testedAt: String(miss.checkedAt || miss.testedAt || '').slice(0, 10) || null,
  }
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
  const missCheck = resolveMissCheck(company)
  const falsifiableProof = Boolean(missCheck)

  let status = 'unverified_index'
  let label = 'Coverage unknown'
  let detail = 'Not enough signal to claim exclusivity.'
  let notInHarmonicLikely = false

  if (alsoPublic) {
    status = 'also_public'
    label = 'Also on public indexes'
    detail = 'Findable on Harmonic / Crunchbase-class tools — not Meridian’s wedge.'
  } else if (missCheck) {
    status = 'community_first'
    label = `Community-only · ${missCheck.index} miss`
    detail = `Dated index check (${missCheck.testedAt || 'on record'}): name search returned no match. Meridian has founders+domain from community materials.`
    notInHarmonicLikely = true
  } else if (isCommunitySource) {
    status = 'community_sourced'
    label = 'Community-sourced — index presence not yet checked'
    detail = 'Sourced from incubator/grant/event materials. We have not asserted index absence.'
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
    checkable: falsifiableProof,
    notInHarmonicLikely,
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
  const communitySourced = list.filter(c => c.coverage?.status === 'community_sourced').length
  const alsoPublic = list.filter(c => c.coverage?.status === 'also_public').length
  const withCohort = list.filter(c => c.cohortDate || c.coverage?.cohortDate).length
  return {
    total: list.length,
    communityFirst,
    communitySourced,
    alsoPublic,
    withCohort,
    communityShare: list.length ? (communityFirst + communitySourced) / list.length : 0,
  }
}
