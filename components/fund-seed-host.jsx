'use client'

import { useLayoutEffect } from 'react'
import { seedFundProfilesIfEmpty } from '@/lib/fund-seeds'
import { ensureActiveFund } from '@/lib/fund-profile'

/** Seeds Sagard + Panache on first visit and keeps a real fund active. */
export default function FundSeedHost() {
  useLayoutEffect(() => {
    seedFundProfilesIfEmpty()
    ensureActiveFund()
  }, [])
  return null
}
