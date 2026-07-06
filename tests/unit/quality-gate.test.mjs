import { describe, it, expect } from 'vitest'
import { runQualityGate, SECTION_VERIFY_MESSAGES } from '@/lib/quality-gate'

describe('quality-gate', () => {
  it('softens team errors to warnings for instant mode', () => {
    const qg = runQualityGate({
      TEAM_1_NAME: 'Undisclosed',
      TEAM_2_NAME: 'Jane Doe',
      TEAM_3_NAME: 'John Smith',
    }, { id: 'guest', isGuest: true }, { researchMode: 'instant' })
    expect(qg.flags.some(f => f.field === 'TEAM_1_NAME' && f.severity === 'warn')).toBe(true)
    expect(qg.flags.some(f => f.field === 'TEAM_1_NAME' && f.severity === 'error')).toBe(false)
  })

  it('keeps team placeholder errors in deep mode', () => {
    const qg = runQualityGate({
      TEAM_1_NAME: 'Undisclosed',
      TEAM_2_NAME: 'Jane Doe',
      TEAM_3_NAME: 'John Smith',
    }, { id: 'guest', isGuest: true }, { researchMode: 'deep' })
    expect(qg.flags.some(f => f.field === 'TEAM_1_NAME' && f.severity === 'error')).toBe(true)
  })

  it('warns guest funds to personalize thesis band', () => {
    const qg = runQualityGate({ TEAM_1_NAME: 'A', TEAM_2_NAME: 'B', TEAM_3_NAME: 'C' }, { id: 'guest', isGuest: true })
    expect(qg.flags.some(f => f.field === 'THESIS_HEADLINE' && f.severity === 'warn')).toBe(true)
  })

  it('emits section-specific confidence flags', () => {
    const qg = runQualityGate(
      { TEAM_1_NAME: 'Jane', TEAM_2_NAME: 'B', TEAM_3_NAME: 'C' },
      { id: 'test', fundName: 'Test Fund' },
      {
        confidenceSummary: ['team', 'funding'],
        researchPasses: [
          { section: 'team', confidence: 'partial', content: '' },
          { section: 'funding', confidence: 'not_found', content: '' },
        ],
      },
    )
    expect(qg.confidenceSummary).toContain('team')
    expect(qg.confidenceSummary).toContain('funding')
    expect(qg.flags.some(f => f.field === 'confidence_team' && f.message === SECTION_VERIFY_MESSAGES.team)).toBe(true)
    expect(qg.flags.some(f => f.field === 'confidence_funding')).toBe(true)
  })
})
