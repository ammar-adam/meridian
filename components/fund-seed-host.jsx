'use client'

import { useEffect } from 'react'
import { seedFundProfilesIfEmpty } from '@/lib/fund-seeds'

export default function FundSeedHost() {
  useEffect(() => {
    seedFundProfilesIfEmpty()
  }, [])
  return null
}
