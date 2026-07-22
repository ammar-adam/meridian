/**
 * Unified Flow feed statistics — digest, Flow page, and /api/digest must agree.
 * Uses the same helpers as benchmark-facing summaries (coverage, reach, ledger).
 */

import { coverageSummary } from '@/lib/coverage-proof'
import { reachabilitySummary } from '@/lib/reachability'
import { ledgerSummary } from '@/lib/freshness-ledger'

/**
 * Compute digest-compatible stats from an annotated company list.
 * @param {object[]} companies — rows with coverage, reach, ledger, isNew, isFresh
 */
export function computeFlowFeedStats(companies = []) {
  const list = companies || []
  const coverage = coverageSummary(list)
  const reach = reachabilitySummary(list)
  const ledger = ledgerSummary(list)

  const newCount = list.filter(c => c.isNew).length
  const freshCount = list.filter(c => c.isFresh).length
  const serialFounders = list.filter(c => c.serialFounder).length
  const strongMatches = list.filter(c => (c.fitScore || 0) >= 80).length

  return {
    total: list.length,
    newCount,
    freshCount,
    communityFirst: coverage.communityFirst,
    communitySourced: coverage.communitySourced + coverage.communityFirst,
    verifiedMiss: ledger.verifiedMiss,
    reachable: reach.direct,
    searchOnly: reach.searchOnly,
    directReachRate: reach.rate,
    withFirstSeen: ledger.withFirstSeen,
    medianAgeDays: ledger.medianAgeDays,
    serialFounders,
    strongMatches,
    alsoPublic: coverage.alsoPublic,
    coverage,
    reach,
    ledger,
  }
}

/** One-line summary for digest hero copy — matches Flow page subtitle math. */
export function flowFeedStatsLine(stats) {
  const s = stats || {}
  const parts = [
    `${s.total || 0} companies`,
    s.communitySourced ? `${s.communitySourced} community-sourced` : null,
    s.verifiedMiss ? `${s.verifiedMiss} verified misses` : null,
    s.reachable ? `${s.reachable} direct-reach` : null,
    s.newCount ? `${s.newCount} new` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
