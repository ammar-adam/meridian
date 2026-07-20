import { describe, it, expect } from 'vitest'
import {
  mergeCompanySeeds,
  dedupeRankedCompanies,
  enforceMinimumResults,
  postProcessDiscoverResults,
  companyDedupKey,
} from '@/lib/discover-merge'

describe('discover-merge', () => {
  it('dedupes by domain across sources', () => {
    const merged = mergeCompanySeeds(
      [{ name: 'Linear', domain: 'linear.app', source: 'startuphub' }],
      [{ name: 'Linear App', domain: 'linear.app', source: 'pitchbook', stage: 'Series C' }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].source).toBe('both')
    expect(merged[0].stage).toBe('Series C')
  })

  it('companyDedupKey prefers domain', () => {
    expect(companyDedupKey({ name: 'Armada', domain: 'armada.ai' })).toBe('d:armada.ai')
  })

  it('backfills from seeds when ranker returns few results', () => {
    const seeds = Array.from({ length: 15 }, (_, i) => ({
      name: `Co ${i}`,
      domain: `co${i}.com`,
      source: 'startuphub',
      description: 'AI infra',
    }))
    const out = postProcessDiscoverResults(
      [{ name: 'Top Co', domain: 'top.co', fitScore: 88, source: 'perplexity' }],
      seeds,
      { min: 12 },
    )
    expect(out.length).toBeGreaterThanOrEqual(12)
    expect(out[0].fitScore).toBeGreaterThanOrEqual(out[1].fitScore)
  })

  it('dedupes ranked companies keeping higher fitScore', () => {
    const out = dedupeRankedCompanies([
      { name: 'Harvey', domain: 'harvey.ai', fitScore: 60 },
      { name: 'Harvey AI', domain: 'harvey.ai', fitScore: 82 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].fitScore).toBe(82)
  })

  it('enforceMinimumResults skips seeds without domain', () => {
    const out = enforceMinimumResults([], [
      { name: 'No Domain Co' },
      { name: 'With Domain', domain: 'with.com' },
    ], { min: 2 })
    expect(out).toHaveLength(1)
    expect(out[0].domain).toBe('with.com')
  })

  it('preferEnrichedIncubators sorts founders+domain incubator rows first', () => {
    const out = postProcessDiscoverResults(
      [
        { name: 'Hub Co', domain: 'hub.co', fitScore: 90, source: 'startuphub' },
        { name: 'Thin Cohort', fitScore: 72, source: 'incubator', provenance: 'Velocity May 2026' },
        {
          name: 'SCADABLE',
          domain: 'scadable.com',
          fitScore: 55,
          source: 'incubator',
          personName: 'Ali Rahbar',
          provenance: 'Velocity May 2026 cohort (2026-05-01)',
          sourceConfidence: 'high',
        },
      ],
      [],
      { preferEnrichedIncubators: true, min: 1, max: 10 },
    )
    expect(out[0].name).toBe('SCADABLE')
    expect(out[0].fitScore).toBeGreaterThanOrEqual(80)
  })
})
