/**
 * Four-persona adversarial debate scorer — GP, Analyst, FO, Investor.
 * Scores 0–10 per dimension from live API probes + static repo checks.
 * Target: average ≥ 7 before investor demo handoff.
 */

export const PERSONAS = ['investor', 'analyst', 'gp', 'fo']

export function scoreCorpusDepth(n) {
  if (n == null) return 4
  if (n >= 500) return 10
  if (n >= 300) return 8
  if (n >= 200) return 7
  if (n >= 100) return 5
  return 3
}

export function scoreIndexProof(n) {
  if (n == null) return 4
  if (n >= 50) return 10
  if (n >= 25) return 8
  if (n >= 15) return 7
  if (n >= 8) return 6
  if (n >= 3) return 5
  return 3
}

export function averageScores(scores) {
  const vals = Object.values(scores).filter(v => typeof v === 'number')
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function personaAverages(dimensions) {
  return {
    investor: averageScores({
      engineering: dimensions.investor_engineering,
      integrity: dimensions.investor_integrity,
      substance: dimensions.investor_substance,
    }),
    analyst: averageScores({
      feed: dimensions.analyst_feed,
      memo: dimensions.analyst_memo,
      workflow: dimensions.analyst_workflow,
    }),
    gp: averageScores({
      trust: dimensions.gp_trust,
      receipts: dimensions.gp_receipts,
      mandate: dimensions.gp_mandate,
    }),
    fo: averageScores({
      clarity: dimensions.fo_clarity,
      onboarding: dimensions.fo_onboarding,
      demo: dimensions.fo_demo,
    }),
  }
}

/**
 * @param {object} probe — live + static probe results
 * @returns {{ dimensions: object, personas: object, average: number, ready: boolean }}
 */
export function scoreAdversarialDebate(probe) {
  const dimensions = {}

  // Investor
  let eng = 0
  if (probe.healthOk) eng += 3
  if (probe.coreFeatures?.aiGeneration) eng += 2
  if (probe.coreFeatures?.persistence) eng += 2
  if (probe.coreFeatures?.deepResearch) eng += 1.5
  if (probe.coreFeatures?.indexChecks) eng += 1.5
  if (probe.outcomesLocked) eng += 2
  if (probe.claimLocked) eng += 2
  dimensions.investor_engineering = Math.min(10, eng)

  let integrity = 5
  if (probe.pilotBenchmarkParity) integrity += 3
  if (probe.feedParity) integrity += 1
  if (probe.corpusLive) integrity += 1
  if (!probe.geoFallbackInCode) integrity -= 3
  if (probe.claimsAuditPass) integrity += 1
  dimensions.investor_integrity = Math.max(0, Math.min(10, integrity))

  dimensions.investor_substance = averageScores({
    corpus: scoreCorpusDepth(probe.companyRecords),
    index: scoreIndexProof(probe.entitiesChecked),
  })

  // Analyst
  dimensions.analyst_feed = averageScores({
    flow: probe.flowReturnsRows ? 8 : 4,
    briefable: probe.briefableFilter ? 8 : 5,
    domain: probe.briefReadyCount >= 5 ? 8 : probe.briefReadyCount >= 1 ? 6 : 4,
  })

  dimensions.analyst_memo = averageScores({
    scrape: probe.scrapeOk ? 8 : 4,
    proof: probe.proofPdf ? 8 : 5,
    health: probe.coreFeatures?.aiGeneration ? 7 : 3,
  })

  dimensions.analyst_workflow = averageScores({
    crm: probe.crmExport ? 8 : 5,
    digest: probe.flowDigest ? 7 : 4,
    enrich: probe.hunterEnrichment ? 7 : 6,
  })

  // GP
  dimensions.gp_trust = averageScores({
    geo: probe.geoFallbackInCode ? 3 : 8,
    landing: probe.landingHonest ? 8 : 5,
    clerk: probe.clerkLive ? 8 : 6,
  })

  dimensions.gp_receipts = averageScores({
    misses: probe.verifiedMisses >= 1 ? 8 : probe.entitiesChecked >= 5 ? 6 : 5,
    proof: probe.proofPdf ? 8 : 5,
    ledger: probe.entitiesChecked >= 10 ? 7 : 5,
  })

  dimensions.gp_mandate = averageScores({
    panache: probe.panacheDefault ? 8 : 6,
    watch: probe.watchMachinery ? 8 : 6,
    parity: probe.feedParity ? 8 : 5,
  })

  // FO
  dimensions.fo_clarity = averageScores({
    demoPage: probe.demoPage ? 9 : 4,
    handoff: probe.handoffDoc ? 9 : 4,
    pricing: probe.pricingPage ? 7 : 5,
  })

  dimensions.fo_onboarding = averageScores({
    allocator: probe.allocatorSetup ? 8 : 6,
    panache: probe.panacheDefault ? 8 : 6,
    empty: probe.geoHonestEmpty ? 7 : 5,
  })

  dimensions.fo_demo = averageScores({
    preflight: probe.preflightScript ? 9 : 4,
    deploy: probe.corpusLive && probe.feedParity ? 8 : probe.corpusLive ? 6 : 4,
    warm: probe.companyRecords >= 200 ? 8 : scoreCorpusDepth(probe.companyRecords),
  })

  const personas = personaAverages(dimensions)
  const allDims = Object.values(dimensions)
  const average = allDims.reduce((a, b) => a + b, 0) / allDims.length

  return {
    dimensions,
    personas,
    average: Math.round(average * 10) / 10,
    ready: average >= 7,
  }
}
