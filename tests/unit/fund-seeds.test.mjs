import { describe, it, expect, beforeEach } from 'vitest'
import { installLocalStorageMock } from '../helpers/local-storage.mjs'

const ls = installLocalStorageMock()

describe('fund seeds + staging identity', () => {
  beforeEach(() => {
    ls.clear()
  })

  it('does not auto-seed Panache on empty store', async () => {
    const { seedFundProfilesIfEmpty } = await import('../../lib/fund-seeds.js')
    const { getAllFunds, hasUserFundProfile } = await import('../../lib/fund-profile.js')

    const seeded = seedFundProfilesIfEmpty()
    expect(seeded).toBe(false)
    expect(getAllFunds()).toHaveLength(0)
    expect(hasUserFundProfile()).toBe(false)
  })

  it('clears unclaimed Panache/Sagard defaults', async () => {
    const { seedDemoFunds, seedFundProfilesIfEmpty, PANACHE_VENTURES } = await import('../../lib/fund-seeds.js')
    const { getAllFunds, hasUserFundProfile } = await import('../../lib/fund-profile.js')
    const { clearUserFundClaimed } = await import('../../lib/investor-identity.js')

    seedDemoFunds({ activateId: PANACHE_VENTURES.id })
    expect(getAllFunds().length).toBe(2)
    expect(hasUserFundProfile()).toBe(true)

    clearUserFundClaimed()
    seedFundProfilesIfEmpty()
    expect(getAllFunds()).toHaveLength(0)
    expect(hasUserFundProfile()).toBe(false)
  })

  it('seedDemoFunds activates Panache for /demo only', async () => {
    const { seedDemoFunds, PANACHE_VENTURES } = await import('../../lib/fund-seeds.js')
    const { getFundProfile, hasUserFundProfile } = await import('../../lib/fund-profile.js')

    seedDemoFunds({ activateId: PANACHE_VENTURES.id })
    expect(getFundProfile()?.id).toBe(PANACHE_VENTURES.id)
    expect(hasUserFundProfile()).toBe(true)
  })

  it('claimUserFund marks identity and activates firm', async () => {
    const { claimUserFund, hasUserFundProfile, getFundProfile } = await import('../../lib/fund-profile.js')

    claimUserFund({
      fundName: 'Rivermark Capital',
      investorType: 'venture_fund',
      thesis: 'Rivermark invests in campus AI pre-seed.',
    })
    expect(hasUserFundProfile()).toBe(true)
    expect(getFundProfile()?.fundName).toBe('Rivermark Capital')
    expect(getFundProfile()?.investorType).toBe('venture_fund')
  })

  it('ensureActiveFund uses first fund, not Panache preference', async () => {
    const { claimUserFund, ensureActiveFund, setActiveFundId, getFundProfile } = await import('../../lib/fund-profile.js')

    claimUserFund({
      fundName: 'Alpha Fund',
      thesis: 'Alpha thesis',
    })
    const store = JSON.parse(localStorage.getItem('meridian_funds_store'))
    store.activeFundId = null
    localStorage.setItem('meridian_funds_store', JSON.stringify(store))

    expect(getFundProfile()).toBeNull()
    const recovered = ensureActiveFund()
    expect(recovered?.fundName).toBe('Alpha Fund')
    setActiveFundId(recovered.id)
  })
})
