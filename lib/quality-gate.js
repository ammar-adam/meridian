import { getFundTerms } from '@/lib/fund-profile'

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

/**
 * Runs quality checks on populated memo data.
 * Returns { passed: bool, flags: Array<{field, severity, message}> }
 */
export function runQualityGate(memoData, fundContext = null) {
  const flags = []

  const statFields = ['STAT_1_VALUE', 'STAT_2_VALUE', 'STAT_3_VALUE']
  for (const field of statFields) {
    const val = memoData[field] ?? ''
    if (!val || val === 'Undisclosed' || val.includes('{{')) {
      flags.push({ field, severity: 'warn', message: 'Stat value missing or undisclosed — verify manually' })
    }
  }

  const PLACEHOLDER_NAMES = ['undisclosed', 'technical co-founder', 'information unavailable', 'tbd', 'unknown']

  const teamNames = ['TEAM_1_NAME', 'TEAM_2_NAME', 'TEAM_3_NAME']
  for (const field of teamNames) {
    const val = (memoData[field] ?? '').trim()
    const lower = val.toLowerCase()
    if (!val || val.includes('{{') || val.length < 3) {
      flags.push({ field, severity: 'error', message: 'Team member name missing — do not show GP without verification' })
    } else if (PLACEHOLDER_NAMES.some(p => lower === p || lower.startsWith(p))) {
      flags.push({ field, severity: 'error', message: 'Team name is a placeholder — verify founder identity before sharing' })
    }
  }

  const teamBios = ['TEAM_1_BIO', 'TEAM_2_BIO', 'TEAM_3_BIO']
  for (const field of teamBios) {
    const val = stripHtml(memoData[field] ?? '')
    if (val && val.length < 20 && !val.toLowerCase().includes('undisclosed')) {
      flags.push({ field, severity: 'warn', message: 'Team bio is very short — verify background' })
    }
  }

  const productLen = stripHtml(memoData.PRODUCT_DESCRIPTION ?? '').length
  if (productLen > 0 && productLen < 80) {
    flags.push({ field: 'PRODUCT_DESCRIPTION', severity: 'warn', message: 'Product section is thin — may indicate sparse research' })
  }

  const GENERIC_THESIS_PHRASES = [
    'strong fit',
    'compelling opportunity',
    'well-positioned',
    'aligns with our thesis',
    'innovative solution',
    'significant market opportunity',
  ]

  const thesisFields = ['THESIS_1_TEXT', 'THESIS_2_TEXT', 'THESIS_3_TEXT', 'THESIS_HEADLINE']
  const fundTerms = fundContext ? getFundTerms(fundContext) : []

  for (const field of thesisFields) {
    const val = (memoData[field] ?? '').toLowerCase()
    for (const phrase of GENERIC_THESIS_PHRASES) {
      if (val.includes(phrase)) {
        flags.push({
          field,
          severity: 'warn',
          message: `Thesis uses generic phrase "${phrase}" — name specific portco overlap`,
        })
        break
      }
    }
  }

  if (fundTerms.length > 0) {
    for (const field of ['THESIS_1_TEXT', 'THESIS_2_TEXT', 'THESIS_3_TEXT']) {
      const val = (memoData[field] ?? '').toLowerCase()
      const hasSpecific = fundTerms.some(term => val.includes(term.toLowerCase()))
      if (!hasSpecific) {
        flags.push({
          field,
          severity: 'warn',
          message: 'Thesis point is generic — does not reference specific portfolio company or fund criterion',
        })
      }
    }
  } else if (fundContext?.isGuest || fundContext?.id === 'guest') {
    flags.push({
      field: 'THESIS_HEADLINE',
      severity: 'warn',
      message: 'Add your fund URL in settings for a personalized thesis band',
    })
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
