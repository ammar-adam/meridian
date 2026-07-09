import { describe, it, expect, beforeEach } from 'vitest'
import { installLocalStorageMock } from '../helpers/local-storage.mjs'
import { DEMO_MEMO_ID } from '../../lib/demo-memo.js'

let storage

beforeEach(() => {
  storage = installLocalStorageMock()
})

describe('memo-library', () => {
  it('saveMemo avoids overwriting demo_nationgraph without allowDemoOverwrite', async () => {
    const { saveMemo, getMemoById } = await import('../../lib/memo-library.js')
    const demoData = { COMPANY_NAME: 'NationGraph', ROUND: 'Series A', DATE: 'June 2026' }
    saveMemo(demoData, DEMO_MEMO_ID, { allowDemoOverwrite: true })

    const stripeData = { COMPANY_NAME: 'Stripe', ROUND: 'Series I', DATE: 'June 2026' }
    const newId = saveMemo(stripeData, DEMO_MEMO_ID)

    expect(newId).not.toBe(DEMO_MEMO_ID)
    expect(getMemoById(DEMO_MEMO_ID)?.data.COMPANY_NAME).toBe('NationGraph')
    expect(getMemoById(newId)?.data.COMPANY_NAME).toBe('Stripe')
  })

  it('findMemoByDomain returns the matching library entry', async () => {
    const { saveMemo, findMemoByDomain } = await import('../../lib/memo-library.js')
    saveMemo(
      { COMPANY_NAME: 'Stripe', ROUND: 'Series I', DATE: 'June 2026' },
      'stripe_test_1',
      { companyDomain: 'stripe.com', fundId: 'guest' },
    )

    const hit = findMemoByDomain('https://stripe.com', { fundId: 'guest', maxAgeMs: 0 })
    expect(hit?.id).toBe('stripe_test_1')
  })

  it('saveMemo upserts legacy null-fundId rows when saving with explicit fundId guest', async () => {
    const { saveMemo, getMemoLibrary } = await import('../../lib/memo-library.js')
    const data = { COMPANY_NAME: 'Chimoney', ROUND: 'Seed', DATE: 'July 2026' }
    saveMemo(data, 'chimoney_legacy', { companyDomain: 'chimoney.io', fundId: null })
    const id = saveMemo(
      { ...data, ROUND: 'Seed (updated)' },
      'chimoney_new',
      { companyDomain: 'chimoney.io', fundId: 'guest' },
    )

    const library = getMemoLibrary()
    const rows = library.filter(e => e.companyDomain === 'chimoney.io')
    expect(rows).toHaveLength(1)
    expect(id).toBe('chimoney_legacy')
    expect(rows[0].data.ROUND).toBe('Seed (updated)')
    expect(rows[0].fundId).toBe('guest')
  })

  it('saveMemo upserts by domain+fundId instead of duplicating', async () => {
    const { saveMemo, getMemoLibrary } = await import('../../lib/memo-library.js')
    const data = { COMPANY_NAME: 'Tuhk', ROUND: 'Seed', DATE: 'July 2026' }
    const first = saveMemo(data, 'tuhk_111', { companyDomain: 'tuhk.com', fundId: 'panache_ventures' })
    const second = saveMemo(
      { ...data, ROUND: 'Seed (updated)' },
      'tuhk_999',
      { companyDomain: 'tuhk.com', fundId: 'panache_ventures' },
    )

    expect(second).toBe(first)
    const library = getMemoLibrary()
    const tuhkRows = library.filter(e => e.companyDomain === 'tuhk.com' && e.fundId === 'panache_ventures')
    expect(tuhkRows).toHaveLength(1)
    expect(tuhkRows[0].data.ROUND).toBe('Seed (updated)')
  })
})
