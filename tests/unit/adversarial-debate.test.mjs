import { describe, it, expect } from 'vitest'
import {
  scoreAdversarialDebate,
  scoreCorpusDepth,
  scoreIndexProof,
  personaAverages,
} from '../../lib/adversarial-debate.js'

describe('adversarial debate scoring', () => {
  it('scores corpus depth with honest thresholds', () => {
    expect(scoreCorpusDepth(350)).toBe(8)
    expect(scoreCorpusDepth(220)).toBe(7)
    expect(scoreCorpusDepth(50)).toBe(3)
  })

  it('scores index proof with honest thresholds', () => {
    expect(scoreIndexProof(20)).toBe(7)
    expect(scoreIndexProof(2)).toBe(3)
  })

  it('passes demo-ready bar with strong probe', () => {
    const result = scoreAdversarialDebate({
      healthOk: true,
      coreFeatures: {
        aiGeneration: true,
        persistence: true,
        deepResearch: true,
        indexChecks: true,
      },
      outcomesLocked: true,
      claimLocked: true,
      pilotBenchmarkParity: true,
      feedParity: true,
      corpusLive: true,
      geoFallbackInCode: false,
      claimsAuditPass: true,
      companyRecords: 320,
      entitiesChecked: 18,
      verifiedMisses: 3,
      flowReturnsRows: true,
      briefableFilter: true,
      briefReadyCount: 12,
      scrapeOk: true,
      proofPdf: true,
      crmExport: true,
      flowDigest: true,
      hunterEnrichment: false,
      landingHonest: true,
      clerkLive: false,
      panacheDefault: true,
      watchMachinery: true,
      demoPage: true,
      handoffDoc: true,
      preflightScript: true,
      pricingPage: true,
      allocatorSetup: true,
      geoHonestEmpty: true,
    })
    expect(result.average).toBeGreaterThanOrEqual(7)
    expect(result.ready).toBe(true)
    expect(personaAverages(result.dimensions).investor).toBeGreaterThanOrEqual(6)
  })

  it('fails when geo fallback remains in code', () => {
    const result = scoreAdversarialDebate({
      healthOk: true,
      coreFeatures: { aiGeneration: true, persistence: true, deepResearch: true, indexChecks: true },
      outcomesLocked: true,
      claimLocked: false,
      pilotBenchmarkParity: false,
      feedParity: false,
      corpusLive: false,
      geoFallbackInCode: true,
      claimsAuditPass: false,
      companyRecords: 80,
      entitiesChecked: 2,
      verifiedMisses: 0,
      flowReturnsRows: false,
      briefableFilter: false,
      briefReadyCount: 0,
      scrapeOk: false,
      proofPdf: false,
      crmExport: false,
      flowDigest: false,
      hunterEnrichment: false,
      landingHonest: false,
      clerkLive: false,
      panacheDefault: false,
      watchMachinery: false,
      demoPage: false,
      handoffDoc: false,
      preflightScript: false,
      pricingPage: false,
      allocatorSetup: false,
      geoHonestEmpty: false,
    })
    expect(result.average).toBeLessThan(7)
    expect(result.ready).toBe(false)
  })
})

describe('pilot benchmark parity', () => {
  it('pilot route overwrites verifiedMiss from benchmark when ledger enabled', async () => {
    const fs = await import('node:fs/promises')
    const pilotSrc = await fs.readFile(new URL('../../app/api/pilot/route.js', import.meta.url), 'utf8')
    expect(pilotSrc).toContain('bench.verifiedMisses')
    expect(pilotSrc).toContain('headlineMetrics')
  })
})
