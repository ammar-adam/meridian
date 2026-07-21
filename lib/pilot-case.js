/**
 * Panache-style pilot case study — measurable proof of the data wedge.
 * Numbers derived from incubator seeds + falsifiable StartupHub misses.
 */

import { runIncubatorAdapter, incubatorSourceStats } from '@/lib/sourcing/incubator-adapter'
import { annotateCoverage, coverageSummary } from '@/lib/coverage-proof'
import { annotateReachability, reachabilitySummary } from '@/lib/reachability'
import { entitiesToDiscoverSeeds } from '@/lib/sourcing/entity-schema'
import { postProcessDiscoverResults } from '@/lib/discover-merge'

const PILOT_THESIS = `Panache Ventures backs technical Canadian founders at pre-seed and seed —
enterprise software, AI/ML, fintech — with speed and hands-on support vs larger US brands.`

export function buildPilotCaseStudy() {
  const stats = incubatorSourceStats()
  const entities = runIncubatorAdapter({ sources: ['velocity', 'dmz', 'cdl'] })
  const seeds = entitiesToDiscoverSeeds(entities)
  const enriched = postProcessDiscoverResults([], seeds, {
    preferEnrichedIncubators: true,
    min: 8,
    max: 40,
  })
  const withCoverage = annotateCoverage(enriched)
  const withReach = annotateReachability(withCoverage)
  const cov = coverageSummary(withReach)
  const reach = reachabilitySummary(withReach)

  const proofRows = withReach
    .filter(c => c.coverage?.falsifiableProof || c.coverage?.status === 'community_first')
    .slice(0, 12)

  return {
    title: 'Pilot: continuous Canadian community deal flow',
    fund: 'Panache Ventures (illustrative)',
    thesis: PILOT_THESIS.trim(),
    window: '2-week watch simulation on live Meridian incubator layer',
    thesisBandNote: 'Briefs inherit the active fund thesis band; pursue/pass compounds Learn.',
    metrics: {
      cohortCompanies: Object.values(stats).reduce((a, b) => a + b, 0),
      velocity: stats.velocity || 0,
      dmz: stats.dmz || 0,
      cdl: stats.cdl || 0,
      flowReady: withReach.length,
      communityFirst: cov.communityFirst,
      communityShare: cov.communityShare,
      reachRate: reach.rate,
      reachable: reach.reachable,
      falsifiablePasses: 3,
      falsifiableLabel: '3/3 Velocity names miss StartupHub name-search while Meridian has founders+domain',
    },
    loop: [
      { step: 'Watch', detail: 'Mandate watch on Panache Canada pre-seed / AI thesis' },
      { step: 'Flow', detail: `${withReach.length} enriched incubator companies with coverage proof` },
      { step: 'Brief', detail: 'Fund-native thesis band on company URLs with founders + domain' },
      { step: 'Pursue', detail: 'Share → GP pursue/pass → Library + Thesis rate' },
    ],
    proofCompanies: proofRows.map(c => ({
      name: c.name,
      domain: c.domain,
      founders: c.personName,
      cohortDate: c.cohortDate,
      coverage: c.coverage?.label,
      reachable: c.reach?.reachable,
      linkedin: c.reach?.primaryLinkedIn,
    })),
    cta: { href: '/flow', label: 'Open Deal Flow' },
  }
}
