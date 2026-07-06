import { describe, it, expect } from 'vitest'
import {
  assessConfidence,
  selectPassesForMode,
  buildResearchPasses,
  formatPassesForSynthesis,
  mergePassesToLegacyString,
  mergeTeamEscalation,
  normalizeResearchResult,
} from '@/lib/research-passes'

describe('research-passes', () => {
  const allPasses = buildResearchPasses('https://stripe.com', 'Stripe', { ogTitle: 'Stripe' })

  it('selects 3 passes for quick mode', () => {
    const selected = selectPassesForMode('quick', allPasses)
    expect(selected).toHaveLength(3)
    expect(selected.map(p => p.section)).toEqual(['product', 'funding', 'team'])
  })

  it('selects 6 passes for deep mode', () => {
    const selected = selectPassesForMode('deep', allPasses)
    expect(selected).toHaveLength(6)
  })

  it('assessConfidence detects not_found', () => {
    expect(assessConfidence('No publicly available information about funding.', 'funding')).toBe('not_found')
    expect(assessConfidence('x', 'team')).toBe('not_found')
  })

  it('assessConfidence detects partial', () => {
    const text = 'It appears that the company may have raised funding. Reportedly they are growing.'
    expect(assessConfidence(text, 'funding')).toBe('partial')
  })

  it('assessConfidence detects found', () => {
    const text = 'Stripe raised $600M in Series H led by Allianz. Founded by Patrick and John Collison.'
    expect(assessConfidence(text, 'funding')).toBe('found')
  })

  it('formats passes with confidence tags', () => {
    const formatted = formatPassesForSynthesis([
      { section: 'team', content: 'Founders: Jane Doe', confidence: 'partial' },
    ])
    expect(formatted).toContain('TEAM [confidence: partial]')
    expect(formatted).toContain('Jane Doe')
  })

  it('merges team escalation when confidence improves', () => {
    const passes = [{ section: 'team', content: 'thin', confidence: 'not_found' }]
    const escalated = { section: 'team_escalation', content: 'Jane Doe, ex-Google', confidence: 'partial' }
    const merged = mergeTeamEscalation(passes, escalated)
    expect(merged[0].content).toContain('Jane Doe')
    expect(merged[0].confidence).toBe('partial')
  })

  it('normalizeResearchResult handles legacy string', () => {
    const r = normalizeResearchResult('legacy research text')
    expect(r.research).toBe('legacy research text')
    expect(r.passes).toEqual([])
  })

  it('mergePassesToLegacyString joins sections', () => {
    const s = mergePassesToLegacyString([
      { section: 'product', content: 'API platform' },
    ])
    expect(s).toContain('## product')
    expect(s).toContain('API platform')
  })
})
