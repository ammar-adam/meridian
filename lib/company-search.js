import { searchStartupHub, isStartupHubConfigured } from '@/lib/startuphub'
import { searchPitchbook, isPitchbookConfigured } from '@/lib/pitchbook'

/**
 * Structured company seeds for Discover — StartupHub primary, PitchBook optional later.
 */
export async function searchCompanyDatabase(parsed, thesis) {
  const [startuphub, pitchbook] = await Promise.all([
    searchStartupHub(parsed, thesis),
    searchPitchbook(parsed),
  ])

  return {
    startuphub,
    pitchbook,
    all: [...startuphub, ...pitchbook],
  }
}

export function getDatabaseSearchMeta({ startuphub, pitchbook }) {
  return {
    startuphubConfigured: isStartupHubConfigured(),
    startuphubCount: startuphub.length,
    pitchbookConfigured: isPitchbookConfigured(),
    pitchbookCount: pitchbook.length,
    databaseCount: startuphub.length + pitchbook.length,
  }
}
