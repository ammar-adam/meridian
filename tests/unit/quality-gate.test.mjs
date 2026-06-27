import { describe, it, expect } from 'vitest'
import { runQualityGate } from '@/lib/quality-gate'

describe('quality-gate', () => {
  it('flags placeholder team names as errors', () => {
    const qg = runQualityGate({
      TEAM_1_NAME: 'Undisclosed',
      TEAM_2_NAME: 'Jane Doe',
      TEAM_3_NAME: 'John Smith',
    }, { id: 'guest', isGuest: true })
    expect(qg.flags.some(f => f.field === 'TEAM_1_NAME' && f.severity === 'error')).toBe(true)
    expect(qg.passed).toBe(false)
  })

  it('warns guest funds to personalize thesis band', () => {
    const qg = runQualityGate({ TEAM_1_NAME: 'A', TEAM_2_NAME: 'B', TEAM_3_NAME: 'C' }, { id: 'guest', isGuest: true })
    expect(qg.flags.some(f => f.field === 'THESIS_HEADLINE' && f.severity === 'warn')).toBe(true)
  })
})
