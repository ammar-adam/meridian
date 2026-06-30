import { describe, it, expect } from 'vitest'
import { extractMetricSignals, applyStatFallbacks, isWeakStatValue } from '@/lib/stat-fallbacks'

describe('stat-fallbacks', () => {
  it('detects weak stat values', () => {
    expect(isWeakStatValue('Undisclosed')).toBe(true)
    expect(isWeakStatValue('$18M')).toBe(false)
  })

  it('extracts total raised and TAM from research', () => {
    const signals = extractMetricSignals({
      research: 'NationGraph raised $18M in Series A. The govtech TAM is $12B annually.',
      memoData: {},
    })
    expect(signals.some(s => s.metricId === 'total_raised')).toBe(true)
    expect(signals.some(s => s.metricId === 'tam')).toBe(true)
  })

  it('fills undisclosed stats using fund preferences', () => {
    const { memoData, statMeta } = applyStatFallbacks(
      {
        STAT_1_VALUE: 'Undisclosed',
        STAT_1_LABEL: 'ARR',
        STAT_2_VALUE: 'Undisclosed',
        STAT_2_LABEL: 'Pending',
        STAT_3_VALUE: 'Undisclosed',
        STAT_3_LABEL: 'Pending',
        ROUND: 'Series A',
      },
      {
        research: 'Company raised $18M total. Serves 500+ enterprise customers. Market is $4.2B.',
        fundContext: { metricPreferences: ['arr', 'total_raised', 'customer_traction'] },
      },
    )
    expect(isWeakStatValue(memoData.STAT_1_VALUE)).toBe(false)
    expect(isWeakStatValue(memoData.STAT_2_VALUE)).toBe(false)
    expect(statMeta.filter(s => s.source !== 'missing').length).toBeGreaterThanOrEqual(2)
  })

  it('preserves strong Claude-generated stats', () => {
    const { memoData } = applyStatFallbacks(
      {
        STAT_1_VALUE: '$50M',
        STAT_1_LABEL: 'ARR',
        STAT_2_VALUE: 'Undisclosed',
        STAT_2_LABEL: 'Pending',
        STAT_3_VALUE: 'Undisclosed',
        STAT_3_LABEL: 'Pending',
      },
      { research: 'raised $18M', fundContext: { metricPreferences: ['arr', 'total_raised', 'tam'] } },
    )
    expect(memoData.STAT_1_VALUE).toBe('$50M')
  })
})
