'use client'

import { useLayoutEffect } from 'react'
import { seedFundProfilesIfEmpty } from '@/lib/fund-seeds'

/** Migrates unclaimed Panache defaults; does not auto-seed demo funds. */
export default function FundSeedHost() {
  useLayoutEffect(() => {
    seedFundProfilesIfEmpty()
  }, [])
  return null
}
