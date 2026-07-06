import { getFundTerms } from '@/lib/fund-profile'
import { isWeakStatValue } from '@/lib/stat-fallbacks'

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

/**
 * Runs quality checks on populated memo data.
 * Returns { passed: bool, flags: Array<{field, severity, message}> }
 */
const TEAM_FIELDS = new Set([
  'TEAM_1_NAME', 'TEAM_2_NAME', 'TEAM_3_NAME',
  'TEAM_1_BIO', 'TEAM_2_BIO', 'TEAM_3_BIO',
])

export const SECTION_VERIFY_MESSAGES = {
  team: 'Team background could not be fully verified — confirm founder details before forwarding',
  funding: 'Funding history incomplete — verify round size and lead investors',
  market: 'Market sizing unverified — confirm TAM figures before forwarding',
  defensibility: 'Defensibility not established from public sources — recommend founder conversation',
  product: 'Product details thin — confirm against website or demo',
  news: 'No recent milestones found — check for unannounced updates',
}

function collectLowConfidenceSections({ confidenceSummary = [], researchPasses = [] }) {
  const sections = new Set(
    (confidenceSummary || []).map(s => String(s).toLowerCase().trim()).filter(Boolean),
  )
  for (const pass of researchPasses || []) {
    if (pass.confidence && pass.confidence !== 'found' && pass.section !== 'team_escalation') {
      sections.add(pass.section)
    }
  }
  return [...sections]
}

function addConfidenceFlags(flags, sections) {
  const flaggedSections = new Set()
  for (const section of sections) {
    const message = SECTION_VERIFY_MESSAGES[section]
    if (!message || flaggedSections.has(section)) continue
    flaggedSections.add(section)
    flags.push({
      field: `confidence_${section}`,
      section,
      severity: 'warn',
      message,
      confidence: true,
    })
  }
  if (sections.length > 0) {
    flags.push({
      field: 'CONFIDENCE_SUMMARY',
      severity: 'warn',
      message: `Sections needing manual verification: ${sections.join(', ')}`,
      confidence: true,
    })
  }
}

/** Instant/auto briefs often lack verified founders — warn instead of blocking GP forward */
function softenTeamFlagsForFastModes(flags, researchMode) {
  if (researchMode !== 'instant' && researchMode !== 'auto') return flags
  return flags.map((flag) => {
    if (flag.severity !== 'error' || !TEAM_FIELDS.has(flag.field)) return flag
    return {
      ...flag,
      severity: 'warn',
      message: 'Founder not verified — brief used site data only; confirm before GP forward',
    }
  })
}

export function runQualityGate(memoData, fundContext = null, options = {}) {
  const {
    researchMode,
    statMeta = [],
    confidenceSummary = [],
    researchPasses = [],
  } = options
  const flags = []

  const lowConfidenceSections = collectLowConfidenceSections({ confidenceSummary, researchPasses })
  addConfidenceFlags(flags, lowConfidenceSections)
  const confidenceFlagged = new Set(lowConfidenceSections)

  const statFields = ['STAT_1_VALUE', 'STAT_2_VALUE', 'STAT_3_VALUE']
  const statLabels = ['STAT_1_LABEL', 'STAT_2_LABEL', 'STAT_3_LABEL']
  for (let i = 0; i < statFields.length; i++) {
    const field = statFields[i]
    const val = memoData[field] ?? ''
    const label = memoData[statLabels[i]] ?? ''
    const meta = statMeta.find(s => s.slot === i + 1)
    if (isWeakStatValue(val)) {
      if (!confidenceFlagged.has('market') && !confidenceFlagged.has('funding')) {
        flags.push({ field, severity: 'warn', message: 'Stat value missing or undisclosed — verify manually' })
      }
    } else if (meta?.source === 'market' || meta?.source === 'fallback') {
      flags.push({
        field,
        severity: 'warn',
        message: `Stat uses ${meta.source === 'market' ? 'market-level' : 'fallback'} data — confirm before GP forward`,
      })
    } else if (/^pending$/i.test(label)) {
      flags.push({ field, severity: 'warn', message: 'Stat label still pending — verify manually' })
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
  if (productLen > 0 && productLen < 80 && !confidenceFlagged.has('product')) {
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

  const adjusted = softenTeamFlagsForFastModes(flags, researchMode)
  const errors = adjusted.filter(f => f.severity === 'error')
  return {
    passed: errors.length === 0,
    flags: adjusted,
    confidenceSummary: lowConfidenceSections,
  }
}
