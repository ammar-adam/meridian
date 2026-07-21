'use client'

import { useLayoutEffect } from 'react'
import { seedFundProfilesIfEmpty } from '@/lib/fund-seeds'

/** Seeds Sagard + Panache on first visit before workspace reads fund context. */
export default function FundSeedHost() {
  useLayoutEffect(() => {
    seedFundProfilesIfEmpty()
  }, [])
  return null
}
