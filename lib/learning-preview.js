import { buildLearningContext } from '@/lib/edit-tracker'

export function getLearningPreview(trackingId) {
  const ctx = buildLearningContext(trackingId)
  if (!ctx) return null

  const correctionCount = ctx.thesisCorrections?.length ?? 0
  const metricSignals = ctx.inferredMetricBoosts?.length ?? 0
  const signalCount = (ctx.pursued?.length ?? 0) + (ctx.passed?.length ?? 0) + correctionCount + (metricSignals > 0 ? 1 : 0)

  if (signalCount === 0) return null

  const parts = []
  if (ctx.pursued?.length) parts.push(`${ctx.pursued.length} pursue`)
  if (ctx.passed?.length) parts.push(`${ctx.passed.length} pass`)
  if (correctionCount) parts.push(`${correctionCount} thesis fixes`)
  if (metricSignals > 0) parts.push('metric prefs from edits')

  return {
    signalCount,
    summary: parts.join(' · '),
    context: ctx,
  }
}

export function learningAppliedMessage(trackingId) {
  const preview = getLearningPreview(trackingId)
  if (!preview) return null
  const rate = preview.context?.pursueRate != null
    ? ` · ${Math.round(preview.context.pursueRate * 100)}% pursue rate`
    : ''
  return `Applied ${preview.signalCount} signal${preview.signalCount !== 1 ? 's' : ''}${rate} (${preview.summary})`
}
