import { describe, it, expect } from 'vitest'
import { normalizeMemoForRender } from '@/lib/memo-render'

describe('normalizeMemoForRender', () => {
  it('coerces PORTFOLIO_ITEMS array of objects to HTML', () => {
    const out = normalizeMemoForRender({
      PORTFOLIO_ITEMS: [
        { name: 'Databricks', fund: 'Series G' },
        { name: 'Okta', fund: 'IPO' },
      ],
    })
    expect(out.PORTFOLIO_ITEMS).toContain('Databricks')
    expect(out.PORTFOLIO_ITEMS).toContain('Okta')
    expect(out.PORTFOLIO_ITEMS).not.toContain('[object Object]')
    expect(out.PORTFOLIO_ITEMS).toContain('portfolio-item')
  })

  it('coerces PORTFOLIO_INTRO array to comma-separated names', () => {
    const out = normalizeMemoForRender({
      PORTFOLIO_INTRO: [{ name: 'Applied Intuition' }, { company: 'Figma' }],
    })
    expect(out.PORTFOLIO_INTRO).toBe('Applied Intuition, Figma')
  })

  it('passes through string portfolio fields unchanged', () => {
    const html = '<div class="portfolio-item">Stripe</div>'
    const out = normalizeMemoForRender({
      PORTFOLIO_ITEMS: html,
      PORTFOLIO_INTRO: 'Similar to Stripe and Plaid',
    })
    expect(out.PORTFOLIO_ITEMS).toBe(html)
    expect(out.PORTFOLIO_INTRO).toBe('Similar to Stripe and Plaid')
  })
})
