import { describe, it, expect, beforeEach } from 'vitest'
import { installLocalStorageMock } from '../helpers/local-storage.mjs'

const ls = installLocalStorageMock()

describe('fund seeds + ensureActiveFund', () => {
  beforeEach(() => {
    ls.clear()
    // Fresh module state is not required — functions read localStorage each call.
  })

  it('seeds both funds and activates a real profile', async () => {
    const { seedFundProfilesIfEmpty, SAGARD_AI_FUND, PANACHE_VENTURES } = await import('../../lib/fund-seeds.js')
    const { getAllFunds, getFundProfile, hasFundProfile } = await import('../../lib/fund-profile.js')

    const seeded = seedFundProfilesIfEmpty()
    expect(seeded).toBe(true)

    const funds = getAllFunds()
    expect(funds.map(f => f.id).sort()).toEqual([PANACHE_VENTURES.id, SAGARD_AI_FUND.id].sort())
    expect(getFundProfile()?.fundName).toBeTruthy()
    expect(getFundProfile()?.fundName).not.toBe('Your Fund')
    expect(hasFundProfile()).toBe(true)
  })

  it('recovers missing activeFundId without reseeding', async () => {
    const { seedFundProfilesIfEmpty } = await import('../../lib/fund-seeds.js')
    const { getFundProfile, ensureActiveFund, getAllFunds } = await import('../../lib/fund-profile.js')

    seedFundProfilesIfEmpty()
    const store = JSON.parse(localStorage.getItem('meridian_funds_store'))
    store.activeFundId = null
    localStorage.setItem('meridian_funds_store', JSON.stringify(store))

    expect(getFundProfile()).toBeNull()
    const recovered = ensureActiveFund()
    expect(recovered?.fundName).toBeTruthy()
    expect(getAllFunds().length).toBe(2)
  })
})
