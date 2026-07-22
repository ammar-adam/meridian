import { describe, it, expect } from 'vitest'
import {
  tokenizeMandate,
  detectStages,
  scoreCompany,
  matchMandate,
} from '@/lib/server/mandate-match'

const WATERLOO_AI = {
  name: 'Worthington',
  domain: 'worthington.ai',
  sector: 'AI / real estate',
  geography: 'Canada · Waterloo',
  stage: 'pre-seed',
  personName: 'Dan Goossen',
  cohortDate: '2026-05-15',
  source: 'incubator',
  description: 'Voice AI for real estate agents',
}

const HEALTH_CO = {
  name: 'Photon IV',
  domain: 'photoniv.com',
  sector: 'HealthTech / medtech',
  geography: 'Canada',
  stage: 'pre-seed',
  personName: 'Someone',
  cohortDate: '2026-05-01',
  source: 'incubator',
}

describe('tokenizeMandate / detectStages', () => {
  it('extracts useful tokens and drops stopwords', () => {
    const tokens = tokenizeMandate('Canadian pre-seed AI companies in Waterloo')
    expect(tokens).toContain('canadian')
    expect(tokens).toContain('ai')
    expect(tokens).toContain('waterloo')
    expect(tokens).not.toContain('the')
  })

  it('detects stages', () => {
    expect(detectStages('pre-seed fintech')).toContain('pre-seed')
    expect(detectStages('Series A SaaS')).toContain('series-a')
  })
})

describe('scoreCompany', () => {
  it('scores higher on sector overlap and returns reasons', () => {
    const { score, matchReasons } = scoreCompany(WATERLOO_AI, {
      tokens: ['ai', 'real', 'estate', 'waterloo'],
      stages: ['pre-seed'],
      thesis: 'Canadian pre-seed AI real estate',
    })
    expect(score).toBeGreaterThan(50)
    expect(matchReasons.some(r => /keyword|sector/i.test(r))).toBe(true)
    expect(matchReasons.some(r => /stage/i.test(r))).toBe(true)
  })

  it('scores weakly when thesis has no overlap', () => {
    const { score, matchReasons } = scoreCompany(WATERLOO_AI, {
      tokens: ['fintech', 'payments', 'latam', 'africa'],
      stages: ['series-b'],
      thesis: 'US Series B fintech LATAM Africa',
    })
    expect(score).toBeLessThan(50)
    expect(matchReasons.length).toBeGreaterThan(0)
  })
})

describe('matchMandate', () => {
  const corpus = [WATERLOO_AI, HEALTH_CO]

  it('returns different rankings for different theses', () => {
    const ai = matchMandate(corpus, { thesis: 'Canadian pre-seed AI real estate Waterloo' })
    const health = matchMandate(corpus, { thesis: 'Canadian pre-seed healthtech medtech' })

    expect(ai.companies[0].name).toBe('Worthington')
    expect(health.companies[0].name).toBe('Photon IV')
    expect(ai.companies[0].fitScore).toBeGreaterThan(health.companies.find(c => c.name === 'Worthington').fitScore)
    expect(ai.meta.canadianMandate).toBe(true)
    expect(ai.companies[0].matchReasons.length).toBeGreaterThan(0)
  })

  it('flags outside coverage for non-Canada mandates against Canada corpus', () => {
    const result = matchMandate(corpus, {
      thesis: 'pre-seed fintech founders in US secondary markets, LATAM, and Africa',
      fundContext: { mandate: { geographies: ['US secondary markets', 'LATAM', 'Africa'] } },
    })
    expect(result.meta.outsideCoverage).toBe(true)
    expect(result.meta.coverageBanner).toBeTruthy()
    expect(result.meta.coverageBanner.title).toMatch(/outside/i)
    expect(result.meta.canadianMandate).toBe(false)
    // Canadian rows dropped by hard geo filter
    expect(result.companies.length).toBe(0)
    expect(result.meta.droppedGeo).toBe(2)
  })

  it('drops US-only rows from Canada-only mandates', () => {
    const mixed = [
      WATERLOO_AI,
      { name: 'OneSignal', domain: 'onesignal.com', geography: 'US', stage: 'series-b', sector: 'devtools' },
    ]
    const result = matchMandate(mixed, {
      thesis: 'Canadian pre-seed AI',
      fundContext: { mandate: { geographies: ['Canada'] } },
    })
    expect(result.companies.some(c => c.name === 'OneSignal')).toBe(false)
    expect(result.meta.droppedGeo).toBeGreaterThan(0)
  })

  it('caps weak matches when thesis has no strong hits', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `Co${i}`,
      domain: `co${i}.com`,
      geography: 'Canada',
      stage: 'pre-seed',
      sector: 'misc',
    }))
    const result = matchMandate(many, { thesis: 'quantum fintech LATAM payments' })
    expect(result.meta.strongMatches).toBe(0)
    expect(result.meta.outsideCoverage).toBe(true)
    expect(result.companies.length).toBeLessThanOrEqual(5)
  })

  it('does not hardcode canadianMandate true for every thesis', () => {
    const result = matchMandate(corpus, { thesis: 'US Series B fintech' })
    expect(result.meta.canadianMandate).toBe(false)
  })
})
