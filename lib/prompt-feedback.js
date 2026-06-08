function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

/**
 * Turn edit patterns into actionable system-prompt tuning notes.
 * Paste output into system-prompt.js after reviewing 10+ memos.
 */
export function generatePromptFeedback(summary, log) {
  const edits = log.filter(e => e.fieldName !== '_outcome')
  const thesisEdits = edits.filter(e => e.isThesisEdit)
  const outcomes = log.filter(e => e.fieldName === '_outcome')

  const sectionCounts = {}
  for (const e of edits) {
    sectionCounts[e.section] = (sectionCounts[e.section] ?? 0) + 1
  }

  const lines = [
    `# Meridian prompt feedback — ${summary.fundName}`,
    `Generated: ${new Date().toISOString()}`,
    `Memos reviewed: ${summary.totalMemos}`,
    `Pursue rate: ${summary.pursueRate != null ? `${(summary.pursueRate * 100).toFixed(0)}%` : 'n/a'}`,
    `Thesis edit rate: ${summary.thesisEditRate != null ? `${(summary.thesisEditRate * 100).toFixed(0)}%` : 'n/a'}`,
    '',
  ]

  if (Object.keys(sectionCounts).length) {
    lines.push('## Edits by section')
    for (const [section, count] of Object.entries(sectionCounts).sort(([, a], [, b]) => b - a)) {
      lines.push(`- ${section}: ${count} corrections`)
    }
    lines.push('')
  }

  if (summary.mostEditedFields.length) {
    lines.push('## Most corrected fields')
    for (const { field, count } of summary.mostEditedFields) {
      lines.push(`- ${field}: ${count}x — tighten Claude instructions for this field`)
    }
    lines.push('')
  }

  if (thesisEdits.length) {
    lines.push('## Thesis corrections (highest signal)')
    for (const e of thesisEdits.slice(0, 8)) {
      lines.push(`### ${e.companyName} — ${e.fieldName}`)
      lines.push(`Claude wrote: "${stripHtml(e.originalValue).slice(0, 200)}"`)
      lines.push(`Analyst fixed: "${e.newValue.slice(0, 200)}"`)
      lines.push('')
    }
    lines.push('## Suggested system-prompt additions')
    lines.push('- Thesis points are still being corrected. Require at least two specific portco names per THESIS_*_TEXT field.')
    lines.push('- Cross-check portco relevance: only name companies with genuine product overlap.')
    lines.push('- Avoid generic "commercial pilot" language — name the pilot use case.')
    lines.push('')
  }

  if (outcomes.length) {
    const pursued = outcomes.filter(e => e.newValue === 'pursue')
    const passed = outcomes.filter(e => e.newValue === 'pass')
    lines.push('## Outcomes')
    lines.push(`- Pursue (${pursued.length}): ${pursued.map(e => e.companyName).join(', ') || 'none'}`)
    lines.push(`- Pass (${passed.length}): ${passed.map(e => e.companyName).join(', ') || 'none'}`)
  }

  if (!edits.length && !outcomes.length) {
    lines.push('No behavioral data yet. Generate and review memos first.')
  }

  return lines.join('\n')
}
