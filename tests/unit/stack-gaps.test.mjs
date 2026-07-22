import { describe, it, expect } from 'vitest'
import { flowCompaniesToCsv, companyToCrmRow } from '@/lib/crm-export'
import { buildDeepDiveLinks } from '@/lib/deep-dive-links'
import { buildProofPacket, proofPacketToText } from '@/lib/proof-packet'
import { computeFlowFeedStats } from '@/lib/flow-feed-stats'
import { buildFlowDigest } from '@/lib/flow-digest'
import { annotateCoverage } from '@/lib/coverage-proof'
import { annotateReachability } from '@/lib/reachability'
import { annotateLedger } from '@/lib/freshness-ledger'
import { filterBySourceType, isCommunityCompany } from '@/lib/source-type'
import { detectWatchEvents, dedupeWatchEvents } from '@/lib/server/watch-events'
import { isClerkLive } from '@/lib/clerk-config'

describe('flowCompaniesToCsv', () => {
  it('includes proof columns for Affinity import', () => {
    const csv = flowCompaniesToCsv([{
      name: 'Acme',
      domain: 'acme.com',
      source: 'incubator',
      provenance: 'Velocity 2026',
      cohortDate: '2026-05-01',
      fitScore: 85,
      reach: { directReach: true, primaryEmail: 'founder@acme.com' },
      coverage: { status: 'community_sourced', label: 'Community-sourced' },
    }], { origin: 'https://meridian.test' })

    expect(csv).toContain('index_checks')
    expect(csv).toContain('coverage_status')
    expect(csv).toContain('direct_reach')
    expect(csv).toContain('founder@acme.com')
    expect(csv).toContain('https://meridian.test/brief')
  })
})

describe('companyToCrmRow proof fields', () => {
  it('includes index check summary', () => {
    const row = companyToCrmRow({
      name: 'Simantic',
      checks: [{ indexName: 'StartupHub', present: false, checkedAt: '2026-06-01' }],
      coverage: { status: 'community_first', label: 'Miss' },
    })
    expect(row.index_checks).toContain('StartupHub:miss')
    expect(row.coverage_status).toBe('community_first')
  })
})

describe('buildDeepDiveLinks', () => {
  it('builds Harmonic, Crunchbase, and Google URLs', () => {
    const links = buildDeepDiveLinks({ name: 'Harvey', domain: 'harvey.ai', personName: 'Winston Weinberg' })
    expect(links.harmonic).toContain('harvey.ai')
    expect(links.crunchbase).toContain('harvey.ai')
    expect(links.google).toContain('Harvey')
    expect(links.linkedin).toContain('Winston')
  })
})

describe('proof packet', () => {
  it('assembles source, first-seen, and index checks', () => {
    const packet = buildProofPacket({
      name: 'SCADABLE',
      domain: 'scadable.com',
      source: 'incubator',
      cohortDate: '2026-05-15',
      checks: [{ indexName: 'StartupHub', present: false, checkedAt: '2026-06-01' }],
      coverage: { status: 'community_first', label: 'Community-only · StartupHub miss' },
      ledger: { firstSeen: '2026-05-15', verification: { status: 'verified_miss', label: 'Not in StartupHub' } },
    }, { origin: 'https://meridian.test', fundName: 'Panache' })

    expect(packet.company.name).toBe('SCADABLE')
    expect(packet.provenance.firstSeen).toBe('2026-05-15')
    expect(packet.indexChecks).toHaveLength(1)
    expect(packet.links.brief).toContain('scadable.com')

    const text = proofPacketToText(packet)
    expect(text).toContain('Index checks')
    expect(text).toContain('StartupHub')
  })
})

describe('digest ↔ flow stats parity', () => {
  it('digest stats match computeFlowFeedStats', () => {
    const companies = annotateReachability(annotateLedger(annotateCoverage([
      {
        name: 'SCADABLE',
        domain: 'scadable.com',
        source: 'incubator',
        cohortDate: '2026-05-15',
        isNew: true,
        isFresh: true,
        fitScore: 88,
      },
    ])))

    const feedStats = computeFlowFeedStats(companies)
    const digest = buildFlowDigest({ fundName: 'Panache', thesis: 'AI', companies })
    expect(digest.stats.total).toBe(feedStats.total)
    expect(digest.stats.communitySourced).toBe(feedStats.communitySourced)
    expect(digest.stats.reachable).toBe(feedStats.reachable)
    expect(digest.stats.verifiedMiss).toBe(feedStats.verifiedMiss)
  })
})

describe('source-type filter', () => {
  it('filters community companies only', () => {
    const list = [
      { name: 'A', source: 'incubator' },
      { name: 'B', source: 'scout' },
      { name: 'C', source: 'record', coverage: { status: 'community_first' } },
    ]
    expect(isCommunityCompany(list[0])).toBe(true)
    expect(isCommunityCompany(list[1])).toBe(false)
    expect(filterBySourceType(list, 'community')).toHaveLength(2)
  })
})

describe('watch events', () => {
  it('detects strong_match, verified_miss, new, serial_founder', () => {
    const events = dedupeWatchEvents(detectWatchEvents([
      { name: 'A', fitScore: 90, isNew: true },
      { name: 'B', coverage: { status: 'community_first' }, ledger: { verification: { status: 'verified_miss' } } },
      { name: 'C', serialFounder: true, priorCompanies: ['OldCo'] },
    ]))
    const types = events.map(e => e.type)
    expect(types).toContain('strong_match')
    expect(types).toContain('verified_miss')
    expect(types).toContain('new_since_last_visit')
    expect(types).toContain('serial_founder')
  })
})

describe('clerk live detection', () => {
  it('returns false without live keys in test env', () => {
    expect(isClerkLive()).toBe(false)
  })
})

describe('renderProofHtml', () => {
  it('renders proof packet HTML for PDF', async () => {
    const { renderProofHtml } = await import('@/lib/render-proof-html')
    const packet = buildProofPacket({ name: 'TestCo', domain: 'test.co' })
    const html = renderProofHtml(packet)
    expect(html).toContain('TestCo')
    expect(html).toContain('Meridian proof packet')
  })
})
