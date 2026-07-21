import { describe, it, expect } from 'vitest'
import { buildCoverageProof, annotateCoverage, coverageSummary } from '../../lib/coverage-proof.js'
import { buildReachability, annotateReachability, reachabilitySummary } from '../../lib/reachability.js'
import { buildFlowDigest } from '../../lib/flow-digest.js'
import { buildIncubatorFastDiscover } from '../../lib/discover-fast.js'
import { buildPilotCaseStudy } from '../../lib/pilot-case.js'

describe('coverage proof', () => {
  it('marks incubator rows community-first with first-seen cohort date', () => {
    const c = buildCoverageProof({
      name: 'SCADABLE',
      source: 'incubator',
      cohortDate: '2026-05-15',
      provenance: 'Velocity May 2026 (2026-05-15)',
    })
    expect(c.status).toBe('community_first')
    expect(c.notInHarmonicLikely).toBe(true)
    expect(c.firstSeenAt).toBe('2026-05-15')
    expect(c.falsifiableProof).toBe(true)
  })

  it('marks widely indexed names as also_public', () => {
    const c = buildCoverageProof({ name: 'Cohere', source: 'incubator' })
    expect(c.status).toBe('also_public')
    expect(c.notInHarmonicLikely).toBe(false)
  })
})

describe('reachability', () => {
  it('is reachable with founders + domain via LinkedIn search and email pattern', () => {
    const r = buildReachability({
      name: 'Simantic',
      personName: 'Seungmin Hong, Ahnaf Shahriar',
      domain: 'simantic.dev',
    })
    expect(r.reachable).toBe(true)
    expect(r.channels).toContain('linkedin')
    expect(r.channels).toContain('email')
    expect(r.primaryLinkedIn).toContain('linkedin.com/search')
    expect(r.primaryEmail).toContain('@simantic.dev')
  })
})

describe('incubator fast discover wedge', () => {
  it('annotates coverage + reachability and hits ≥70% reach on Flow-ready rows', () => {
    const payload = buildIncubatorFastDiscover(
      'Canadian AI pre-seed from Velocity DMZ CDL',
      { id: 'panache_ventures', fundName: 'Panache Ventures', mandate: { geographies: ['Canada'] } },
    )
    expect(payload.companies.length).toBeGreaterThanOrEqual(8)
    expect(payload.meta.coverage.communityFirst).toBeGreaterThan(0)
    expect(payload.meta.reachability.rate).toBeGreaterThanOrEqual(0.7)
    expect(payload.companies[0].coverage?.label).toBeTruthy()
    expect(payload.companies[0].reach).toBeTruthy()
  })
})

describe('incubator flow discover wedge', () => {
  it('expands community rows while keeping high reachability', async () => {
    const { buildIncubatorFlowDiscover } = await import('../../lib/discover-fast.js')
    const payload = buildIncubatorFlowDiscover(
      'Canadian AI pre-seed from Velocity DMZ CDL',
      { id: 'panache_ventures', fundName: 'Panache Ventures', mandate: { geographies: ['Canada'] } },
    )
    expect(payload.companies.length).toBeGreaterThanOrEqual(12)
    expect(payload.meta.reachability.rate).toBeGreaterThanOrEqual(0.7)
    expect(payload.meta.coverage.communityFirst).toBeGreaterThan(5)
  })
})

describe('flow digest + pilot', () => {
  it('builds a digest with stats', () => {
    const companies = annotateReachability(annotateCoverage([
      {
        name: 'SCADABLE',
        domain: 'scadable.com',
        personName: 'Ali Rahbar',
        source: 'incubator',
        cohortDate: '2026-05-15',
        isNew: true,
        isFresh: true,
        fitScore: 88,
      },
    ]))
    const digest = buildFlowDigest({
      fundName: 'Panache Ventures',
      thesis: 'Canadian pre-seed AI',
      companies,
    })
    expect(digest.subject).toContain('Panache')
    expect(digest.stats.communityFirst).toBe(1)
    expect(digest.text).toContain('SCADABLE')
  })

  it('pilot case study exposes measurable wedge metrics', () => {
    const study = buildPilotCaseStudy()
    expect(study.metrics.flowReady).toBeGreaterThan(5)
    expect(study.metrics.reachRate).toBeGreaterThanOrEqual(0.7)
    expect(study.metrics.falsifiablePasses).toBe(3)
    expect(study.proofCompanies.length).toBeGreaterThan(0)
  })
})

describe('coverage summary', () => {
  it('summarizes annotated lists', () => {
    const list = annotateCoverage([
      { name: 'SCADABLE', source: 'incubator', cohortDate: '2026-05-15' },
      { name: 'Cohere', source: 'incubator' },
    ])
    const s = coverageSummary(list)
    expect(s.communityFirst).toBe(1)
    expect(s.alsoPublic).toBe(1)
  })
})
