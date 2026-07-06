import { searchStartupHub, isStartupHubConfigured } from '@/lib/startuphub'
import { searchPitchbook, isPitchbookConfigured } from '@/lib/pitchbook'
import { filterSeedsForMandate } from '@/lib/geography-utils'

/**
 * Structured company seeds for Discover — StartupHub + PitchBook, geography-filtered.
 */
export async function searchCompanyDatabase(parsed, thesis, fundContext = null) {
  const [startuphubRaw, pitchbookRaw] = await Promise.all([
    searchStartupHub(parsed, thesis, fundContext),
    searchPitchbook(parsed),
  ])

  const startuphub = filterSeedsForMandate(startuphubRaw, parsed?.geographies, fundContext)
  const pitchbook = filterSeedsForMandate(pitchbookRaw, parsed?.geographies, fundContext)

  return {
    startuphub,
    pitchbook,
    startuphubRawCount: startuphubRaw.length,
    pitchbookRawCount: pitchbookRaw.length,
    all: [...startuphub, ...pitchbook],
  }
}

export function getDatabaseSearchMeta({ startuphub, pitchbook, startuphubRawCount, pitchbookRawCount }) {
  return {
    startuphubConfigured: isStartupHubConfigured(),
    startuphubCount: startuphub.length,
    startuphubRawCount: startuphubRawCount ?? startuphub.length,
    pitchbookConfigured: isPitchbookConfigured(),
    pitchbookCount: pitchbook.length,
    pitchbookRawCount: pitchbookRawCount ?? pitchbook.length,
    databaseCount: startuphub.length + pitchbook.length,
  }
}
