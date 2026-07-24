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
    expect(getFundProfile()?.id).toBe(PANACHE_VENTURES.id)
    expect(getFundProfile()?.fundName).toBe(PANACHE_VENTURES.fundName)
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
    expect(recovered?.id).toBe('panache_ventures')
    expect(recovered?.fundName).toBeTruthy()
    expect(getAllFunds().length).toBe(2)
  })

  it('keeps the user firm after switching away from Panache', async () => {
    const { seedFundProfilesIfEmpty, SAGARD_AI_FUND } = await import('../../lib/fund-seeds.js')
    const { setActiveFundId, getFundProfile, ensureActiveFund } = await import('../../lib/fund-profile.js')

    seedFundProfilesIfEmpty()
    setActiveFundId(SAGARD_AI_FUND.id)
    expect(getFundProfile()?.id).toBe(SAGARD_AI_FUND.id)

    seedFundProfilesIfEmpty()
    ensureActiveFund()
    expect(getFundProfile()?.id).toBe(SAGARD_AI_FUND.id)
  })

  it('seeds multi-vehicle strategies on canned firms', async () => {
    const { seedFundProfilesIfEmpty, PANACHE_VENTURES } = await import('../../lib/fund-seeds.js')
    const { getFundProfile } = await import('../../lib/fund-profile.js')

    seedFundProfilesIfEmpty()
    const panache = getFundProfile(PANACHE_VENTURES.id)
    expect(panache.strategies.length).toBeGreaterThanOrEqual(2)
    expect(panache.strategies.map(s => s.name)).toContain('First check')
  })

  it('reseeds when marker is set but funds store is empty', async () => {
    const { seedFundProfilesIfEmpty, PANACHE_VENTURES } = await import('../../lib/fund-seeds.js')
    const { getAllFunds, getFundProfile } = await import('../../lib/fund-profile.js')

    seedFundProfilesIfEmpty()
    localStorage.setItem('meridian_fund_seeds_applied', '1')
    localStorage.removeItem('meridian_funds_store')

    expect(getAllFunds().length).toBe(0)
    seedFundProfilesIfEmpty()
    expect(getAllFunds().length).toBe(2)
    expect(getFundProfile()?.id).toBe(PANACHE_VENTURES.id)
  })
})
