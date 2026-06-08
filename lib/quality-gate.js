/**
 * Runs quality checks on populated memo data.
 * Returns { passed: bool, flags: Array<{field, severity, message}> }
 *
 * severity: 'error' (blocks render) | 'warn' (shows flag in UI)
 */
export function runQualityGate(memoData) {
  const flags = []

  const statFields = ['STAT_1_VALUE', 'STAT_2_VALUE', 'STAT_3_VALUE']
  for (const field of statFields) {
    const val = memoData[field] ?? ''
    if (!val || val === 'Undisclosed' || val.includes('{{')) {
      flags.push({ field, severity: 'warn', message: 'Stat value missing or undisclosed — verify manually' })
    }
  }

  const teamNames = ['TEAM_1_NAME', 'TEAM_2_NAME', 'TEAM_3_NAME']
  for (const field of teamNames) {
    const val = memoData[field] ?? ''
    if (!val || val.includes('{{') || val.length < 3) {
      flags.push({ field, severity: 'error', message: 'Team member name missing — do not show GP without verification' })
    }
  }

  const thesisFields = ['THESIS_1_TEXT', 'THESIS_2_TEXT', 'THESIS_3_TEXT']
  const fundTerms = ['Portage', 'Diagram', 'Power Corp', 'Lifeco', 'IGM', 'Benepass',
                     'KidKare', 'Ansel', 'Xceedance', 'Lyteflo', 'Novisto', 'Canadian']
  for (const field of thesisFields) {
    const val = memoData[field] ?? ''
    const hasSpecific = fundTerms.some(term => val.includes(term))
    if (!hasSpecific) {
      flags.push({ field, severity: 'warn', message: 'Thesis point is generic — does not reference specific portco or fund arm' })
    }
  }

  if (!memoData.HERO_IMAGE_URL) {
    flags.push({ field: 'HERO_IMAGE_URL', severity: 'warn', message: 'No hero image found — using fallback background' })
  }

  const requiredKeys = [
    'COMPANY_NAME', 'COMPANY_INITIAL', 'COMPANY_TAGLINE', 'COMPANY_LOGO_URL',
    'HERO_IMAGE_URL', 'ROUND', 'DATE', 'PRODUCT_DESCRIPTION', 'MARKET_DESCRIPTION',
    'STAT_1_VALUE', 'STAT_1_LABEL', 'STAT_2_VALUE', 'STAT_2_LABEL',
    'STAT_3_VALUE', 'STAT_3_LABEL', 'DEFENSE_1_TITLE', 'DEFENSE_1_TEXT',
    'DEFENSE_2_TITLE', 'DEFENSE_2_TEXT', 'TEAM_1_INITIALS', 'TEAM_1_ROLE',
    'TEAM_1_NAME', 'TEAM_1_BIO', 'TEAM_2_INITIALS', 'TEAM_2_ROLE', 'TEAM_2_NAME',
    'TEAM_2_BIO', 'TEAM_3_INITIALS', 'TEAM_3_ROLE', 'TEAM_3_NAME', 'TEAM_3_BIO',
    'PORTFOLIO_INTRO', 'PORTFOLIO_ITEMS', 'FUND_ANGLE_LABEL', 'THESIS_HEADLINE',
    'THESIS_1_TITLE', 'THESIS_1_TEXT', 'THESIS_2_TITLE', 'THESIS_2_TEXT',
    'THESIS_3_TITLE', 'THESIS_3_TEXT', 'FUND_NAME', 'FUND_LOGO_URL',
  ]

  for (const key of requiredKeys) {
    if (memoData[key] === undefined || memoData[key] === null) {
      flags.push({ field: key, severity: 'error', message: `Missing required field: ${key}` })
    }
  }

  const errors = flags.filter(f => f.severity === 'error')
  return { passed: errors.length === 0, flags }
}
