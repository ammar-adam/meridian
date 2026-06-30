/**
 * Compact behavioral context from pursue/pass + edits — sent to /api/generate.
 */

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

export function buildLearningContextFromLog(log, trackingId) {
  const scoped = log.filter(e => (e.trackingId ?? e.fundName) === trackingId)
  const edits = scoped.filter(e => e.fieldName !== '_outcome')
  const outcomes = scoped.filter(e => e.fieldName === '_outcome')

  const thesisCorrections = edits
    .filter(e => e.isThesisEdit)
    .slice(0, 6)
    .map(e => ({
      field: e.fieldName,
      company: e.companyName,
      claudeWrote: stripHtml(e.originalValue).slice(0, 180),
      analystFixed: e.newValue.slice(0, 180),
    }))

  const pursued = outcomes.filter(e => e.newValue === 'pursue').map(e => e.companyName)
  const passed = outcomes.filter(e => e.newValue === 'pass').map(e => e.companyName)

  if (!thesisCorrections.length && !pursued.length && !passed.length) {
    return null
  }

  return {
    trackingId,
    thesisCorrections,
    pursued: pursued.slice(0, 12),
    passed: passed.slice(0, 12),
    pursueRate: outcomes.length
      ? pursued.length / outcomes.length
      : null,
  }
}

export function formatLearningBlock(learning) {
  if (!learning) return ''

  const lines = ['Behavioral learning from this fund\'s prior brief reviews:']

  if (learning.pursued?.length) {
    lines.push(`\nCompanies marked PURSUE (patterns to lean into): ${learning.pursued.join(', ')}`)
  }
  if (learning.passed?.length) {
    lines.push(`\nCompanies marked PASS (avoid similar framing): ${learning.passed.join(', ')}`)
  }
  if (learning.thesisCorrections?.length) {
    lines.push('\nThesis band corrections analysts made (do NOT repeat the "claude wrote" phrasing):')
    for (const c of learning.thesisCorrections) {
      lines.push(`- ${c.company} / ${c.field}: prefer "${c.analystFixed}" over "${c.claudeWrote}"`)
    }
  }
  if (learning.pursueRate != null) {
    lines.push(`\nHistorical pursue rate: ${(learning.pursueRate * 100).toFixed(0)}%`)
  }
  if (learning.inferredMetricBoosts?.length) {
    const top = learning.inferredMetricBoosts.slice(0, 3).map(b => b.id).join(', ')
    lines.push(`\nAnalysts frequently correct market stats toward: ${top}. Prioritize these when filling STAT slots.`)
  }

  lines.push('\nApply these signals when writing the thesis band. Name specific portfolio companies where relevant.')
  return lines.join('\n')
}
