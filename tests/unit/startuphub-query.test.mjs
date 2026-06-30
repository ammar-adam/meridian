import { describe, it, expect } from 'vitest'
import { buildStartupHubQueries } from '@/lib/startuphub'

describe('buildStartupHubQueries', () => {
  it('returns focused queries without full thesis blob', () => {
    const queries = buildStartupHubQueries({
      pitchbookQuery: 'AI infrastructure fintech',
      sectors: ['AI', 'Financial Services'],
      keywords: ['infrastructure', 'Series A'],
      stages: ['Series A'],
    }, 'AI infrastructure for financial services, Series A, North America — very long thesis text that should not dominate')

    expect(queries.length).toBeGreaterThan(0)
    expect(queries[0]).toContain('AI infrastructure')
    expect(queries[0].length).toBeLessThanOrEqual(120)
    expect(queries[0]).not.toContain('very long thesis')
  })

  it('dedupes identical query strings', () => {
    const queries = buildStartupHubQueries({ sectors: ['AI'] }, 'AI')
    const unique = new Set(queries)
    expect(unique.size).toBe(queries.length)
  })
})
