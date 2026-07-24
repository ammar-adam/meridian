import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { entitiesToDiscoverSeeds, enrichmentTier } from '@/lib/sourcing/entity-schema'
import { postProcessDiscoverResults } from '@/lib/discover-merge'
import { isCanadianMandate, normalizeGeographies } from '@/lib/geography-utils'
import { annotateCoverage, coverageSummary } from '@/lib/coverage-proof'
import { annotateReachability, reachabilitySummary } from '@/lib/reachability'
import { annotateLedger, ledgerSummary } from '@/lib/freshness-ledger'
import { matchMandate } from '@/lib/server/mandate-match'

const COMMUNITY_THESIS_RE = /canada|canadian|waterloo|ontario|toronto|montreal|vancouver|calgary|velocity|dmz|cdl|pre-?seed|incubator|accelerator/i

/** True when Discover should paint community incubator seeds before slow research. */
export function wantsIncubatorFastPath(thesis, fundContext) {
  const geos = normalizeGeographies(null, fundContext)
  if (isCanadianMandate(geos, fundContext)) return true
  if (COMMUNITY_THESIS_RE.test(thesis || '')) return true
  return false
}

function annotateWedge(companies) {
  return annotateReachability(annotateLedger(annotateCoverage(companies)))
}

/**
 * Sync Discover payload from curated incubator cohorts — founders+domain first paint.
 */
export function buildIncubatorFastDiscover(thesis, fundContext) {
  const entities = runIncubatorAdapter()
  const seeds = entitiesToDiscoverSeeds(entities)
  let companies = postProcessDiscoverResults([], seeds, {
    preferEnrichedIncubators: true,
    min: 8,
    max: 40,
  })
  companies = annotateWedge(companies)

  const matched = matchMandate(companies, { thesis, fundContext })

  return {
    companies: matched.companies,
    meta: {
      thesis,
      fundId: fundContext?.id || null,
      partial: true,
      incubatorFastPath: true,
      seedCount: seeds.length,
      incubatorResultCount: matched.companies.filter(c => c.source === 'incubator').length,
      thin: matched.companies.length < 8,
      thinCanadian: false,
      canadianMandate: matched.meta.canadianMandate,
      coverageBanner: matched.meta.coverageBanner,
      match: matched.meta,
      researchPasses: [],
      coverage: coverageSummary(matched.companies),
      reachability: reachabilitySummary(matched.companies),
      ledger: ledgerSummary(matched.companies),
    },
  }
}

/**
 * Deal Flow feed — the full community wedge, ranked against the mandate.
 * Every row carries matchReasons explaining its fitScore. Off-corpus
 * mandates get an honest coverage banner instead of fake high scores.
 */
export function buildIncubatorFlowDiscover(thesis, fundContext) {
  const entities = runIncubatorAdapter()
  const seeds = entitiesToDiscoverSeeds(entities)
    .filter(s => s.personName || s.domain)
    .sort((a, b) => enrichmentTier(b) - enrichmentTier(a) || (b.fitScore || 0) - (a.fitScore || 0) || String(a.name || '').localeCompare(String(b.name || '')))

  let companies = postProcessDiscoverResults([], seeds, {
    preferEnrichedIncubators: false,
    min: 12,
    max: 60,
  })
  companies = companies.filter(c => c.source === 'incubator' && (c.personName || c.domain))
  companies = annotateWedge(companies)

  const matched = matchMandate(companies, { thesis, fundContext })

  return {
    companies: matched.companies,
    meta: {
      thesis,
      fundId: fundContext?.id || null,
      flow: true,
      incubatorFlowPath: true,
      seedCount: seeds.length,
      incubatorResultCount: matched.companies.length,
      thin: matched.companies.length < 8,
      canadianMandate: matched.meta.canadianMandate,
      coverageBanner: matched.meta.coverageBanner,
      match: matched.meta,
      researchPasses: [],
      coverage: coverageSummary(matched.companies),
      reachability: reachabilitySummary(matched.companies),
      ledger: ledgerSummary(matched.companies),
    },
  }
}
