/**
 * Anonymized pilot case study — measurable proof of the data wedge.
 * Numbers derived from incubator seeds + falsifiable StartupHub misses.
 * The fund is presented anonymously: this is an illustrative mandate, not
 * a claim that any named fund is a customer.
 */

import { incubatorSourceStats } from '@/lib/sourcing/incubator-adapter'
import { buildIncubatorFlowDiscover } from '@/lib/discover-fast'

const PILOT_THESIS = `A Canadian pre-seed fund backing technical Canadian founders at pre-seed and seed —
enterprise software, AI/ML, fintech — with speed and hands-on support vs larger US brands.`

export function buildPilotCaseStudy() {
  const stats = incubatorSourceStats()
  const payload = buildIncubatorFlowDiscover(PILOT_THESIS, {
    id: 'pilot_fund',
    fundName: 'A Canadian pre-seed fund',
    mandate: { geographies: ['Canada'], stages: ['pre-seed', 'seed'], sectors: ['AI', 'enterprise software'] },
  })
  const withReach = payload.companies || []
  const cov = payload.meta?.coverage || {}
  const reach = payload.meta?.reachability || {}
  const led = payload.meta?.ledger || {}

  const proofRows = withReach
    .filter(c =>
      c.coverage?.falsifiableProof
      || c.coverage?.status === 'community_first'
      || c.coverage?.status === 'community_sourced'
    )
    .slice(0, 12)

  // Derived from the live payload — never a hardcoded claim.
  const falsifiable = withReach.filter(c =>
    c.coverage?.falsifiableProof || c.ledger?.verification?.status === 'verified_miss'
  )

  return {
    title: 'Pilot: continuous Canadian community deal flow',
    fund: 'A Canadian pre-seed fund (anonymized pilot)',
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
      communitySourced: cov.communitySourced || 0,
      communityShare: cov.communityShare || 0,
      reachRate: reach.rate || 0,
      reachable: reach.direct ?? reach.reachable ?? 0,
      searchOnly: reach.searchOnly || 0,
      founderRate: reach.founderRate || 0,
      withFirstSeen: led.withFirstSeen || 0,
      verifiedMiss: led.verifiedMiss || 0,
      medianAgeDays: led.medianAgeDays ?? null,
      falsifiablePasses: falsifiable.length,
      falsifiableLabel: falsifiable.length
        ? `${falsifiable.length} community names miss StartupHub name-search while Meridian has founders+domain — repeat the search yourself`
        : 'No index-check misses on record yet — checks accrue automatically and we claim nothing without one',
    },
    loop: [
      { step: 'Watch', detail: 'Mandate watch on a Canadian pre-seed / AI thesis' },
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
