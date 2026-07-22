import { describe, it, expect } from 'vitest'
import { buildCoverageProof, annotateCoverage, coverageSummary } from '../../lib/coverage-proof.js'
import { buildReachability, annotateReachability, reachabilitySummary } from '../../lib/reachability.js'
import { buildFlowDigest } from '../../lib/flow-digest.js'
import { buildIncubatorFastDiscover, buildIncubatorFlowDiscover } from '../../lib/discover-fast.js'
import { buildPilotCaseStudy } from '../../lib/pilot-case.js'
import { buildLedgerEntry, annotateLedger, ledgerSummary } from '../../lib/freshness-ledger.js'
import { companyToCrmRow, companyToCrmText } from '../../lib/crm-export.js'

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
  it('is reachable with founders + domain via LinkedIn search; never invents emails', () => {
    const r = buildReachability({
      name: 'Simantic',
      personName: 'Seungmin Hong, Ahnaf Shahriar',
      domain: 'simantic.dev',
    })
    expect(r.reachable).toBe(true)
    expect(r.channels).toContain('linkedin')
    expect(r.channels).not.toContain('email')
    expect(r.primaryLinkedIn).toContain('linkedin.com/search')
    expect(r.primaryEmail).toBe(null)
  })

  it('surfaces verified emails when provided', () => {
    const r = buildReachability({
      name: 'Simantic',
      personName: 'Seungmin Hong',
      domain: 'simantic.dev',
      founderEmails: ['seungmin@simantic.dev'],
    })
    expect(r.channels).toContain('email')
    expect(r.primaryEmail).toBe('seungmin@simantic.dev')
    expect(r.founders[0].emailConfidence).toBe('verified')
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

describe('freshness ledger', () => {
  it('marks StartupHub-tested names as verified_miss with first-seen + stage', () => {
    const e = buildLedgerEntry({
      name: 'SCADABLE',
      source: 'incubator',
      cohortDate: '2026-05-15',
      provenance: 'Velocity May 2026 (2026-05-15)',
      sourceMeta: { program: 'velocity' },
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

  it('summarizes a ledger', () => {
    const list = annotateLedger([
      { name: 'SCADABLE', source: 'incubator', cohortDate: '2026-05-15', provenance: 'Velocity May 2026', sourceMeta: { program: 'velocity' } },
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
  it('reports honest reachability ≥70% without hard-filtering founders', () => {
    const payload = buildIncubatorFlowDiscover(
      'Canadian AI pre-seed from Velocity DMZ CDL',
      { id: 'panache_ventures', fundName: 'Panache Ventures', mandate: { geographies: ['Canada'] } },
    )
    expect(payload.companies.length).toBeGreaterThanOrEqual(12)
    expect(payload.meta.reachability.rate).toBeGreaterThanOrEqual(0.7)
    expect(payload.meta.ledger.withFirstSeen).toBeGreaterThan(0)
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
    expect(digest.stats.communityFirst).toBe(1)
    expect(digest.text).toContain('SCADABLE')
  })

  it('pilot case study exposes measurable wedge metrics', () => {
    const study = buildPilotCaseStudy()
    expect(study.metrics.flowReady).toBeGreaterThan(5)
    expect(study.metrics.reachRate).toBeGreaterThanOrEqual(0.7)
    // Derived from live payload data, never hardcoded.
    expect(typeof study.metrics.falsifiablePasses).toBe('number')
    if (study.metrics.falsifiablePasses > 0) {
      expect(study.metrics.falsifiableLabel).toContain(String(study.metrics.falsifiablePasses))
    }
    expect(study.proofCompanies.length).toBeGreaterThan(0)
  })

  it('pilot case study never names a real fund', () => {
    const study = buildPilotCaseStudy()
    expect(study.fund).toBe('A Canadian pre-seed fund (anonymized pilot)')
    expect(JSON.stringify(study)).not.toMatch(/Panache|Sagard/i)
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
