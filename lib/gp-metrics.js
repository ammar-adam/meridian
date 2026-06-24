import { getEditLog, getEditSummary } from '@/lib/edit-tracker'
import { getMemoLibrary } from '@/lib/memo-library'

const BETA_BRIEF_TARGET = 10
const BETA_PURSUE_TARGET = 3

/**
 * GP-forward proxy: briefs an analyst would forward without rewriting thesis.
 * Zero thesis edits + pursued = strongest forward signal.
 */
export function computeGpForwardMetrics(trackingId) {
  const summary = getEditSummary(trackingId)
  const library = getMemoLibrary().filter(
    e => !trackingId || e.trackingId === trackingId || e.fundName === summary.fundName
  )
  const log = getEditLog().filter(e => (e.trackingId ?? e.fundName) === trackingId)

  const outcomes = log.filter(e => e.fieldName === '_outcome')
  const thesisEditsByMemo = new Map()
  for (const e of log) {
    if (!e.isThesisEdit) continue
    thesisEditsByMemo.set(e.memoId, (thesisEditsByMemo.get(e.memoId) || 0) + 1)
  }

  const pursuedOutcomes = outcomes.filter(e => e.newValue === 'pursue')
  const pursuedNoThesisEdit = pursuedOutcomes.filter(e => !thesisEditsByMemo.has(e.memoId))
  const pursuedZeroEdits = pursuedOutcomes.filter(e => (e.editCount ?? 0) === 0)

  const totalBriefs = Math.max(summary.totalMemos, library.length)
  const reviewed = outcomes.length

  const gpForwardRate = pursuedOutcomes.length
    ? pursuedNoThesisEdit.length / pursuedOutcomes.length
    : null

  const zeroEditForwardRate = pursuedOutcomes.length
    ? pursuedZeroEdits.length / pursuedOutcomes.length
    : null

  const betaProgress = {
    briefs: { current: totalBriefs, target: BETA_BRIEF_TARGET, met: totalBriefs >= BETA_BRIEF_TARGET },
    pursue: { current: pursuedOutcomes.length, target: BETA_PURSUE_TARGET, met: pursuedOutcomes.length >= BETA_PURSUE_TARGET },
    gpForward: {
      current: gpForwardRate,
      target: 0.5,
      met: gpForwardRate != null && gpForwardRate >= 0.5,
    },
  }

  const betaReady = betaProgress.briefs.met && betaProgress.pursue.met && betaProgress.gpForward.met

  return {
    trackingId,
    totalBriefs,
    reviewed,
    pursueCount: pursuedOutcomes.length,
    passCount: outcomes.filter(e => e.newValue === 'pass').length,
    gpForwardRate,
    zeroEditForwardRate,
    thesisEditRate: summary.thesisEditRate,
    pursuedNoThesisEdit: pursuedNoThesisEdit.length,
    betaProgress,
    betaReady,
    validationMessage: betaReady
      ? 'Beta validation threshold met — GP-forward proxy ≥50% on pursue with no thesis rewrites.'
      : totalBriefs < BETA_BRIEF_TARGET
        ? `Run ${BETA_BRIEF_TARGET - totalBriefs} more brief${BETA_BRIEF_TARGET - totalBriefs !== 1 ? 's' : ''} to hit beta target.`
        : pursuedOutcomes.length < BETA_PURSUE_TARGET
          ? `Mark ${BETA_PURSUE_TARGET - pursuedOutcomes.length} more pursue to validate forward rate.`
          : 'Improve thesis band — too many thesis edits on pursued deals.',
  }
}

export function exportGpMetricsCsv(metrics) {
  const rows = [
    ['metric', 'value'],
    ['total_briefs', metrics.totalBriefs],
    ['reviewed', metrics.reviewed],
    ['pursue_count', metrics.pursueCount],
    ['gp_forward_rate', metrics.gpForwardRate?.toFixed(2) ?? ''],
    ['zero_edit_forward_rate', metrics.zeroEditForwardRate?.toFixed(2) ?? ''],
    ['thesis_edit_rate', metrics.thesisEditRate?.toFixed(2) ?? ''],
    ['beta_ready', metrics.betaReady ? 'yes' : 'no'],
  ]
  return rows.map(r => r.join(',')).join('\n')
}
