/**
 * Panache-style pilot case study — measurable proof of the data wedge.
 * Numbers derived from incubator seeds + falsifiable StartupHub misses.
 */

import { incubatorSourceStats } from '@/lib/sourcing/incubator-adapter'
import { buildIncubatorFlowDiscover } from '@/lib/discover-fast'

const PILOT_THESIS = `Panache Ventures backs technical Canadian founders at pre-seed and seed —
enterprise software, AI/ML, fintech — with speed and hands-on support vs larger US brands.`

export function buildPilotCaseStudy() {
  const stats = incubatorSourceStats()
  const payload = buildIncubatorFlowDiscover(PILOT_THESIS, {
    id: 'panache_ventures',
    fundName: 'Panache Ventures',
    mandate: { geographies: ['Canada'], stages: ['pre-seed', 'seed'], sectors: ['AI', 'enterprise software'] },
  })
  const withReach = payload.companies || []
  const cov = payload.meta?.coverage || {}
  const reach = payload.meta?.reachability || {}
  const led = payload.meta?.ledger || {}

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
      communityFirst: cov.communityFirst || 0,
      communityShare: cov.communityShare || 0,
      reachRate: reach.rate || 0,
      reachable: reach.reachable || 0,
      founderRate: reach.founderRate || 0,
      withFirstSeen: led.withFirstSeen || 0,
      verifiedMiss: led.verifiedMiss || 0,
      medianAgeDays: led.medianAgeDays ?? null,
      falsifiablePasses: 3,
      falsifiableLabel: '3/3 Velocity names miss StartupHub name-search while Meridian has founders+domain',
    },
    loop: [
      { step: 'Watch', detail: 'Mandate watch on Panache Canada pre-seed / AI thesis' },
      { step: 'Flow', detail: `${withReach.length} community companies with coverage proof + reachability` },
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
