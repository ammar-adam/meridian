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
})
