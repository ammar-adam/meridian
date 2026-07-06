import { describe, it, expect } from 'vitest'
import { enforceConfidenceOnStats } from '@/lib/confidence-enforcement'

describe('enforceConfidenceOnStats', () => {
  it('strips dollar stats when funding is not_found', () => {
    const memo = {
      STAT_1_VALUE: '$9M',
      STAT_1_LABEL: 'Total raised',
      STAT_2_VALUE: '2,000+',
      STAT_2_LABEL: 'Integrations',
      ROUND: 'Seed',
      LEAD_INVESTOR: 'Acme VC',
    }
    const out = enforceConfidenceOnStats(memo, [
      { section: 'funding', confidence: 'not_found' },
    ])
    expect(out.STAT_1_VALUE).toBe('Undisclosed')
    expect(out.LEAD_INVESTOR).toBe('Undisclosed')
    expect(out.ROUND).toBe('Seed')
    expect(out.STAT_2_VALUE).toBe('2,000+')
  })

  it('strips stage mislabeled as total raised when funding is not_found', () => {
    const memo = { STAT_1_VALUE: 'Seed', STAT_1_LABEL: 'Total raised' }
    const out = enforceConfidenceOnStats(memo, [{ section: 'funding', confidence: 'not_found' }])
    expect(out.STAT_1_VALUE).toBe('Undisclosed')
  })

  it('clears mislabeled TAM in total_raised slot when funding is not_found', () => {
    const memo = { STAT_1_VALUE: '$47B', STAT_1_LABEL: 'Addressable market' }
    const out = enforceConfidenceOnStats(memo, [{ section: 'funding', confidence: 'not_found' }], {
      metricPreferences: ['total_raised', 'customer_traction', 'tam'],
    })
    expect(out.STAT_1_VALUE).toBe('Undisclosed')
    expect(out.STAT_1_LABEL?.toLowerCase()).toContain('raised')
  })

  it('flags market TAM when market is partial', () => {
    const memo = {
      STAT_3_VALUE: '$50B',
      STAT_3_LABEL: 'Addressable market',
    }
    const out = enforceConfidenceOnStats(memo, [
      { section: 'market', confidence: 'partial' },
    ], { metricPreferences: ['total_raised', 'customer_traction', 'tam'] })
    expect(out.STAT_3_VALUE).toBe('Undisclosed')
    expect(out.STAT_3_LABEL).toContain('unverified')
  })
})
