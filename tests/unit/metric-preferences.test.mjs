import { describe, it, expect } from 'vitest'
import {
  normalizeMetricPreferences,
  mergeMetricPreferences,
  inferMetricBoostsFromEdits,
  formatMetricPreferencesBlock,
} from '@/lib/metric-preferences'

describe('metric-preferences', () => {
  it('defaults to three standard metrics', () => {
    expect(normalizeMetricPreferences([])).toEqual(['total_raised', 'customer_traction', 'tam'])
  })

  it('keeps user order up to three', () => {
    expect(normalizeMetricPreferences(['arr', 'valuation', 'founded', 'users'])).toEqual(['arr', 'valuation', 'founded'])
  })

  it('merges inferred boosts toward front', () => {
    const merged = mergeMetricPreferences(['tam', 'total_raised', 'customer_traction'], [{ id: 'arr', count: 3 }])
    expect(merged[0]).toBe('arr')
  })

  it('infers ARR from stat edits', () => {
    const boosts = inferMetricBoostsFromEdits([
      { trackingId: 'fund:primary', fieldName: 'STAT_1_VALUE', newValue: '$12M ARR', originalValue: 'Undisclosed' },
      { trackingId: 'fund:primary', fieldName: 'STAT_1_LABEL', newValue: 'ARR', originalValue: 'Pending' },
    ], 'fund:primary')
    expect(boosts.some(b => b.id === 'arr')).toBe(true)
  })

  it('formats prompt block', () => {
    const block = formatMetricPreferencesBlock(['arr', 'tam'])
    expect(block).toContain('ARR / revenue')
    expect(block).toContain('STAT_1')
  })
})
