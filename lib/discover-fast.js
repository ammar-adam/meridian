import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { entitiesToDiscoverSeeds } from '@/lib/sourcing/entity-schema'
import { postProcessDiscoverResults } from '@/lib/discover-merge'
import { isCanadianMandate, normalizeGeographies } from '@/lib/geography-utils'
import { annotateCoverage, coverageSummary } from '@/lib/coverage-proof'
import { annotateReachability, reachabilitySummary } from '@/lib/reachability'

const COMMUNITY_THESIS_RE = /canada|canadian|waterloo|ontario|toronto|montreal|vancouver|calgary|velocity|dmz|cdl|pre-?seed|incubator|accelerator/i

/** True when Discover should paint community incubator seeds before slow research. */
export function wantsIncubatorFastPath(thesis, fundContext) {
  const geos = normalizeGeographies(null, fundContext)
  if (isCanadianMandate(geos, fundContext)) return true
  if (COMMUNITY_THESIS_RE.test(thesis || '')) return true
  return false
}

/**
 * Sync Discover/Flow payload from curated incubator cohorts — no Perplexity, no Claude.
 * Attaches coverage proof + founder reachability (the data wedge, visible).
 */
export function buildIncubatorFastDiscover(thesis, fundContext) {
  const entities = runIncubatorAdapter()
  const seeds = entitiesToDiscoverSeeds(entities)
  let companies = postProcessDiscoverResults([], seeds, {
    preferEnrichedIncubators: true,
    min: 8,
    max: 40,
  })
  companies = annotateReachability(annotateCoverage(companies))

  return {
    companies,
    meta: {
      thesis,
      fundId: fundContext?.id || null,
      partial: true,
      incubatorFastPath: true,
      seedCount: seeds.length,
      incubatorResultCount: companies.filter(c => c.source === 'incubator').length,
      thin: companies.length < 8,
      thinCanadian: false,
      canadianMandate: true,
      researchPasses: [],
      coverage: coverageSummary(companies),
      reachability: reachabilitySummary(companies),
    },
  }
}
