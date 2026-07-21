import { describe, it, expect, beforeEach } from 'vitest'
import {
  annotateFlowCompanies,
  sortFlowCompanies,
  flowSummary,
  cohortAgeDays,
} from '@/lib/mandate-watch'

describe('mandate-watch', () => {
  beforeEach(() => {
    // jsdom / vitest may not have localStorage fully; functions tolerate missing window
  })

  it('marks recent cohortDate as fresh', () => {
    const recent = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const old = '2024-01-01'
    expect(cohortAgeDays({ cohortDate: recent })).toBeLessThanOrEqual(31)
    expect(cohortAgeDays({ cohortDate: old })).toBeGreaterThan(120)

    const annotated = annotateFlowCompanies([
      { name: 'NewCo', domain: 'new.co', cohortDate: recent, fitScore: 80 },
      { name: 'OldCo', domain: 'old.co', cohortDate: old, fitScore: 90 },
    ], { fundId: null })

    expect(annotated[0].isFresh).toBe(true)
    expect(annotated[1].isFresh).toBe(false)
  })

  it('sorts new and fresh ahead of older high-fit rows', () => {
    const recent = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10)
    const sorted = sortFlowCompanies([
      { name: 'OldHigh', domain: 'a.com', fitScore: 95, isNew: false, isFresh: false, cohortDate: '2024-01-01' },
      { name: 'Fresh', domain: 'b.com', fitScore: 70, isNew: false, isFresh: true, cohortDate: recent },
      { name: 'BrandNew', domain: 'c.com', fitScore: 60, isNew: true, isFresh: true, cohortDate: recent },
    ])
    expect(sorted[0].name).toBe('BrandNew')
    expect(sorted[1].name).toBe('Fresh')
  })

  it('summarizes new and fresh counts', () => {
    const s = flowSummary([
      { isNew: true, isFresh: true },
      { isNew: false, isFresh: true },
      { isNew: false, isFresh: false },
    ])
    expect(s).toEqual({ total: 3, newCount: 1, freshCount: 2 })
  })
})
