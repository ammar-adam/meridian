import { getFundProfile, getActiveStrategy, getTrackingId } from '@/lib/fund-profile'
import { getMemoLibrary } from '@/lib/memo-library'
import { loadSourceResults } from '@/lib/source-session'
import { getEditSummary } from '@/lib/edit-tracker'

/** Client-side snapshot of workspace state for context bar and nav badges. */
export function getWorkspaceSnapshot() {
  const profile = getFundProfile()
  const strategy = getActiveStrategy(profile)
  const trackingId = profile && strategy ? getTrackingId(profile, strategy) : 'default'
  const library = getMemoLibrary()
  const source = loadSourceResults()

  const strategyLibrary = strategy
    ? library.filter(e => e.fundId === profile?.id && e.strategyId === strategy.id)
    : library

  const pendingReview = strategyLibrary.filter(e => !e.outcome).length
  const summary = getEditSummary(trackingId)

  const sourceMatches = source
    && source.fundId === profile?.id
    && source.strategyId === strategy?.id

  return {
    fundName: profile?.fundName ?? null,
    strategyName: strategy?.name ?? null,
    hasFund: Boolean(profile),
    lastThesis: sourceMatches ? source.thesis : null,
    lastSearchAt: sourceMatches ? source.savedAt : null,
    lastSearchCount: sourceMatches ? (source.companies?.length ?? 0) : 0,
    briefCount: strategyLibrary.length,
    pendingReview,
    reviewedCount: summary?.totalMemos ?? 0,
    pursueCount: summary?.pursueCount ?? 0,
  }
}
