import { describe, it, expect } from 'vitest'
import { buildCoverageProof, annotateCoverage, coverageSummary } from '../../lib/coverage-proof.js'
import { buildReachability, annotateReachability, reachabilitySummary } from '../../lib/reachability.js'
import { buildFlowDigest } from '../../lib/flow-digest.js'
import { buildIncubatorFastDiscover, buildIncubatorFlowDiscover } from '../../lib/discover-fast.js'
import { buildPilotCaseStudy } from '../../lib/pilot-case.js'
import { buildLedgerEntry, annotateLedger, ledgerSummary } from '../../lib/freshness-ledger.js'
import { companyToCrmRow, companyToCrmText } from '../../lib/crm-export.js'

const MISS_CHECK = {
  index: 'StartupHub',
  result: 'no name match',
  testedAt: '2026-07-20',
  present: false,
}

describe('coverage proof', () => {
  it('marks incubator rows community_sourced when no index check exists', () => {
    const c = buildCoverageProof({
      name: 'SCADABLE',
      source: 'incubator',
      cohortDate: '2026-05-15',
      provenance: 'Velocity May 2026 (2026-05-15)',
    })
    expect(c.status).toBe('community_sourced')
    expect(c.notInHarmonicLikely).toBe(false)
    expect(c.firstSeenAt).toBe('2026-05-15')
    expect(c.falsifiableProof).toBe(false)
    expect(c.label).toMatch(/not yet checked/i)
  })

  it('marks community_first only when a dated miss check is provided', () => {
    const c = buildCoverageProof({
      name: 'SCADABLE',
      source: 'incubator',
      cohortDate: '2026-05-15',
      provenance: 'Velocity May 2026 (2026-05-15)',
      indexTest: MISS_CHECK,
    })
    expect(c.status).toBe('community_first')
    expect(c.notInHarmonicLikely).toBe(true)
    expect(c.falsifiableProof).toBe(true)
    expect(c.checkable).toBe(true)
  })

  it('marks widely indexed names as also_public', () => {
    const c = buildCoverageProof({ name: 'Cohere', source: 'incubator' })
    expect(c.status).toBe('also_public')
    expect(c.notInHarmonicLikely).toBe(false)
  })
})

describe('reachability', () => {
  it('offers LinkedIn search but does not count it toward rate', () => {
    const r = buildReachability({
      name: 'Simantic',
      personName: 'Seungmin Hong, Ahnaf Shahriar',
      domain: 'simantic.dev',
    })
    expect(r.reachable).toBe(true)
    expect(r.searchOnly).toBe(true)
    expect(r.directReach).toBe(false)
    expect(r.channels).toContain('linkedin_search')
    expect(r.channels).not.toContain('email')
    expect(r.primaryLinkedIn).toContain('linkedin.com/search')
    expect(r.primaryEmail).toBe(null)
  })

  it('surfaces verified emails when provided and counts as directReach', () => {
    const r = buildReachability({
      name: 'Simantic',
      personName: 'Seungmin Hong',
      domain: 'simantic.dev',
      founderEmails: ['seungmin@simantic.dev'],
    })
    expect(r.channels).toContain('email')
    expect(r.directReach).toBe(true)
    expect(r.searchOnly).toBe(false)
    expect(r.primaryEmail).toBe('seungmin@simantic.dev')
    expect(r.founders[0].emailConfidence).toBe('verified')
  })

  it('counts direct LinkedIn profiles toward rate, not search links', () => {
    const annotated = annotateReachability([
      { name: 'A', personName: 'Ada Lovelace', domain: 'a.com' },
      {
        name: 'B',
        personName: 'Grace Hopper',
        domain: 'b.com',
        linkedinUrls: ['https://www.linkedin.com/in/gracehopper'],
      },
      {
        name: 'C',
        personName: 'Alan Turing',
        domain: 'c.com',
        founderEmails: ['alan@c.com'],
      },
    ])
    const s = reachabilitySummary(annotated)
    expect(s.direct).toBe(2)
    expect(s.searchOnly).toBe(1)
    expect(s.rate).toBeCloseTo(2 / 3)
  })
})

describe('incubator fast discover wedge', () => {
  it('annotates coverage + reachability without inventing verified misses', () => {
    const payload = buildIncubatorFastDiscover(
      'Canadian AI pre-seed from Velocity DMZ CDL',
      { id: 'panache_ventures', fundName: 'Panache Ventures', mandate: { geographies: ['Canada'] } },
    )
    expect(payload.companies.length).toBeGreaterThanOrEqual(8)
    expect(payload.meta.coverage.communitySourced).toBeGreaterThan(0)
    expect(payload.meta.coverage.communityFirst).toBe(0)
    expect(payload.meta.ledger.verifiedMiss).toBe(0)
    // Honest rate: search links do not inflate it
    expect(payload.meta.reachability.rate).toBeLessThan(0.3)
    expect(payload.meta.reachability.searchOnly).toBeGreaterThan(0)
    expect(payload.companies[0].coverage?.label).toBeTruthy()
    expect(payload.companies[0].reach).toBeTruthy()
  })
})

describe('incubator flow discover wedge', () => {
  it('expands community rows with honest reachability math', async () => {
    const { buildIncubatorFlowDiscover } = await import('../../lib/discover-fast.js')
    const payload = buildIncubatorFlowDiscover(
      'Canadian AI pre-seed from Velocity DMZ CDL',
      { id: 'panache_ventures', fundName: 'Panache Ventures', mandate: { geographies: ['Canada'] } },
    )
    expect(payload.companies.length).toBeGreaterThanOrEqual(12)
    expect(payload.meta.reachability.rate).toBeLessThan(0.3)
    expect(payload.meta.coverage.communitySourced).toBeGreaterThan(5)
    expect(payload.meta.coverage.communityFirst).toBe(0)
  })
})

describe('freshness ledger', () => {
  it('requires an explicit indexTest for verified_miss — never hardcodes names', () => {
    const unchecked = buildLedgerEntry({
      name: 'SCADABLE',
      source: 'incubator',
      cohortDate: '2026-05-15',
      provenance: 'Velocity May 2026 (2026-05-15)',
      sourceMeta: { program: 'velocity' },
    })
    expect(unchecked.verification.status).toBe('community_sourced')
    expect(unchecked.indexTest).toBe(null)

    const e = buildLedgerEntry({
      name: 'SCADABLE',
      source: 'incubator',
      cohortDate: '2026-05-15',
      provenance: 'Velocity May 2026 (2026-05-15)',
      sourceMeta: { program: 'velocity' },
      indexTest: MISS_CHECK,
    })
    expect(e.verification.status).toBe('verified_miss')
    expect(e.verification.checkable).toBe(true)
    expect(e.firstSeen).toBe('2026-05-15')
    expect(e.stageSignal).toBe('pre-seed')
    expect(e.ageDays).toBeGreaterThan(0)
  })

  it('marks domain-registry rows as pre-announcement signal', () => {
    const e = buildLedgerEntry({
      name: 'SHFT ROBOTICS INC',
      source: 'domain_registry',
      provenance: 'Incorporated 2026-06-21 · ON · live domain shftrobotics.com',
    })
    expect(e.verification.status).toBe('signal_based')
    expect(e.verification.label).toBe('Pre-announcement signal')
    expect(e.verification.checkable).toBe(true)
  })

  it('marks untested community rows as community_sourced (no false index claim)', () => {
    const e = buildLedgerEntry({
      name: 'Some DMZ Co',
      source: 'incubator',
      cohortDate: '2026-03-01',
      provenance: 'DMZ Incubator Spring 2026 (2026-03-01)',
      sourceMeta: { program: 'dmz' },
    })
    expect(e.verification.status).toBe('community_sourced')
    expect(e.stageSignal).toContain('seed')
  })

  it('summarizes a ledger using only explicit checks for verified_miss', () => {
    const list = annotateLedger([
      {
        name: 'SCADABLE',
        source: 'incubator',
        cohortDate: '2026-05-15',
        provenance: 'Velocity May 2026',
        sourceMeta: { program: 'velocity' },
        indexTest: MISS_CHECK,
      },
      { name: 'Some DMZ Co', source: 'incubator', cohortDate: '2026-03-01', provenance: 'DMZ', sourceMeta: { program: 'dmz' } },
    ])
    const s = ledgerSummary(list)
    expect(s.verifiedMiss).toBe(1)
    expect(s.communitySourced).toBe(1)
    expect(s.withFirstSeen).toBe(2)
    expect(s.withStage).toBe(2)
  })
})

describe('CRM export row', () => {
  it('builds a CRM record with wedge signals', () => {
    const [c] = annotateLedger(annotateReachability(annotateCoverage([{
      name: 'Simantic',
      domain: 'simantic.dev',
      personName: 'Seungmin Hong, Ahnaf Shahriar',
      source: 'incubator',
      cohortDate: '2026-05-15',
      provenance: 'Velocity May 2026',
      sourceMeta: { program: 'velocity' },
    }])))
    const row = companyToCrmRow(c)
    expect(row.company).toBe('Simantic')
    expect(row.domain).toBe('simantic.dev')
    expect(row.first_seen).toBe('2026-05-15')
    expect(companyToCrmText(c)).toContain('Simantic')
  })
})

describe('flow discover full feed', () => {
  it('reports honest reachability without counting search links as direct-reach', () => {
    const payload = buildIncubatorFlowDiscover(
      'Canadian AI pre-seed from Velocity DMZ CDL',
      { id: 'panache_ventures', fundName: 'Panache Ventures', mandate: { geographies: ['Canada'] } },
    )
    expect(payload.companies.length).toBeGreaterThanOrEqual(12)
    expect(payload.meta.reachability.rate).toBeLessThan(0.3)
    expect(payload.meta.reachability.searchOnly).toBeGreaterThan(0)
    expect(payload.meta.ledger.withFirstSeen).toBeGreaterThan(0)
    expect(payload.meta.ledger.verifiedMiss).toBe(0)
    expect(payload.companies[0].ledger).toBeTruthy()
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
    expect(digest.stats.communitySourced).toBe(1)
    expect(digest.stats.communityFirst).toBe(0)
    expect(digest.text).toContain('SCADABLE')
    expect(digest.text).not.toMatch(/before public indexes/i)
  })

  it('pilot case study exposes measurable wedge metrics', () => {
    const study = buildPilotCaseStudy()
    expect(study.metrics.flowReady).toBeGreaterThan(5)
    // Direct-reach rate is honest (near zero until enrichment); search links are separate.
    expect(study.metrics.reachRate).toBeLessThan(0.3)
    expect(typeof study.metrics.falsifiablePasses).toBe('number')
    expect(study.metrics.falsifiablePasses).toBe(0)
    expect(study.metrics.falsifiableLabel).toMatch(/No index-check misses/i)
    expect(study.proofCompanies.length).toBeGreaterThan(0)
  })

  it('pilot case study never names a real fund', () => {
    const study = buildPilotCaseStudy()
    expect(study.fund).toBe('A Canadian pre-seed fund (anonymized pilot)')
    expect(JSON.stringify(study)).not.toMatch(/Panache|Sagard/i)
  })
})

describe('coverage summary', () => {
  it('summarizes annotated lists without inventing community_first', () => {
    const list = annotateCoverage([
      { name: 'SCADABLE', source: 'incubator', cohortDate: '2026-05-15' },
      { name: 'Cohere', source: 'incubator' },
      {
        name: 'Simantic',
        source: 'incubator',
        cohortDate: '2026-05-15',
        indexTest: MISS_CHECK,
      },
    ])
    const s = coverageSummary(list)
    expect(s.communitySourced).toBe(1)
    expect(s.communityFirst).toBe(1)
    expect(s.alsoPublic).toBe(1)
  })
})
