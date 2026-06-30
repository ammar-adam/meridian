import { describe, it, expect } from 'vitest'
import { libraryToCsv, libraryRowToCrmText } from '@/lib/crm-export'

describe('libraryToCsv', () => {
  it('includes thesis, share link, and review_outcome columns', () => {
    const csv = libraryToCsv([
      {
        id: 'abc',
        companyName: 'Harvey',
        companyDomain: 'harvey.ai',
        round: 'Series B',
        outcome: 'pursue',
        fundName: 'a16z',
        savedAt: '2026-06-30T12:00:00.000Z',
        lastShareId: 'share123',
        data: { THESIS_HEADLINE: '<strong>Legal AI moat</strong>' },
      },
    ], { origin: 'https://meridian.test' })

    expect(csv).toContain('thesis_headline')
    expect(csv).toContain('share_link')
    expect(csv).toContain('review_outcome')
    expect(csv).toContain('Legal AI moat')
    expect(csv).toContain('https://meridian.test/share/share123')
    expect(csv).toContain('pursue')
  })
})

describe('libraryRowToCrmText', () => {
  it('returns plain-text brief from library entry', () => {
    const text = libraryRowToCrmText({
      companyName: 'Linear',
      outcome: 'pursue',
      data: {
        COMPANY_NAME: 'Linear',
        ROUND: 'Series C',
        DATE: 'June 2026',
        COMPANY_TAGLINE: 'Issue tracking',
        PRODUCT_DESCRIPTION: 'Fast issues',
        MARKET_DESCRIPTION: 'Dev tools',
        STAT_1_VALUE: '$10M',
        STAT_1_LABEL: 'ARR',
        STAT_2_VALUE: '—',
        STAT_2_LABEL: '—',
        STAT_3_VALUE: '—',
        STAT_3_LABEL: '—',
        THESIS_HEADLINE: 'Workflow moat',
        THESIS_1_TITLE: 'Fit',
        THESIS_1_TEXT: 'PLG',
        THESIS_2_TITLE: 'Moat',
        THESIS_2_TEXT: 'Speed',
        THESIS_3_TITLE: 'Risk',
        THESIS_3_TEXT: 'Competition',
        FUND_NAME: 'Test Fund',
      },
    })
    expect(text).toContain('Linear')
    expect(text).toContain('THESIS')
    expect(text).toContain('Review: PURSUE')
  })
})
