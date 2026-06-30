/** Score how much public web signal exists for a scrape result. */
export function scoreScrapeCoverage(scraped) {
  if (!scraped) return { score: 0, level: 'low', reasons: ['No scrape data'] }

  const reasons = []
  let score = 0

  if (scraped.ogTitle?.trim()) score += 25
  else reasons.push('Missing page title')

  if (scraped.ogDescription?.trim() && scraped.ogDescription.length > 40) score += 25
  else reasons.push('Thin or missing description')

  if (scraped.ogImage?.trim()) score += 20
  else reasons.push('No hero image')

  if (scraped.favicon?.trim()) score += 10
  if (scraped.domain?.trim()) score += 20

  const level = score >= 70 ? 'good' : score >= 40 ? 'medium' : 'low'
  return { score, level, reasons: level === 'low' ? reasons : [] }
}

export function coverageLabel(level) {
  if (level === 'good') return null
  if (level === 'medium') return 'Limited coverage'
  return 'Low coverage'
}

/** Hint for auto mode — shown on preview card. */
export function coverageModeHint(level) {
  if (level === 'good') return 'Auto uses Quick research (~50–75s) for verified funding and team data.'
  if (level === 'medium') return 'Auto uses Quick research — limited public copy on site.'
  return 'Auto uses Quick research — consider Deep for thin sites.'
}
