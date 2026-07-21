import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { entitiesToDiscoverSeeds } from '@/lib/sourcing/entity-schema'
import { postProcessDiscoverResults } from '@/lib/discover-merge'
import { isCanadianMandate, normalizeGeographies } from '@/lib/geography-utils'

const COMMUNITY_THESIS_RE = /canada|canadian|waterloo|ontario|toronto|montreal|vancouver|calgary|velocity|dmz|cdl|pre-?seed|incubator|accelerator/i

/** True when Discover should paint community incubator seeds before slow research. */
export function wantsIncubatorFastPath(thesis, fundContext) {
  const geos = normalizeGeographies(null, fundContext)
  if (isCanadianMandate(geos, fundContext)) return true
  if (COMMUNITY_THESIS_RE.test(thesis || '')) return true
  return false
}

/**
 * Sync Discover payload from curated incubator cohorts — no Perplexity, no Claude.
 * Typically &lt;50ms. Used for the magical first paint on Canadian / community theses.
 */
export function buildIncubatorFastDiscover(thesis, fundContext) {
  const entities = runIncubatorAdapter()
  const seeds = entitiesToDiscoverSeeds(entities)
  const companies = postProcessDiscoverResults([], seeds, {
    preferEnrichedIncubators: true,
    min: 8,
    max: 40,
  })

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
    },
  }
}
