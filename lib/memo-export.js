function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

/**
 * Plain-text memo export for email / Slack / CRM paste.
 */
export function memoToShareText(memoData, { outcome, editCount } = {}) {
  if (!memoData) return ''

  const lines = [
    `${memoData.COMPANY_NAME} — ${memoData.ROUND} · ${memoData.DATE}`,
    stripHtml(memoData.COMPANY_TAGLINE),
    '',
    '── PRODUCT ──',
    stripHtml(memoData.PRODUCT_DESCRIPTION),
    '',
    '── MARKET ──',
    stripHtml(memoData.MARKET_DESCRIPTION),
    `• ${memoData.STAT_1_VALUE} — ${memoData.STAT_1_LABEL}`,
    `• ${memoData.STAT_2_VALUE} — ${memoData.STAT_2_LABEL}`,
    `• ${memoData.STAT_3_VALUE} — ${memoData.STAT_3_LABEL}`,
    '',
    '── THESIS ──',
    stripHtml(memoData.THESIS_HEADLINE),
    '',
    `${memoData.THESIS_1_TITLE}: ${stripHtml(memoData.THESIS_1_TEXT)}`,
    `${memoData.THESIS_2_TITLE}: ${stripHtml(memoData.THESIS_2_TEXT)}`,
    `${memoData.THESIS_3_TITLE}: ${stripHtml(memoData.THESIS_3_TEXT)}`,
    '',
    `Prepared by ${memoData.FUND_NAME} via Meridian`,
  ]

  if (outcome) lines.push(`Review: ${outcome.toUpperCase()}${editCount ? ` · ${editCount} edits` : ''}`)

  return lines.join('\n')
}

export async function copyMemoShare(memoData, meta = {}) {
  const text = memoToShareText(memoData, meta)
  await navigator.clipboard.writeText(text)
  return text
}

export async function createShareLink(memoData, meta = {}) {
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memoData, meta }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create share link')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/share/${data.id}`
}

export async function downloadMemoPdf(memoData) {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memoData }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'PDF failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(memoData.COMPANY_NAME || 'memo').replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
