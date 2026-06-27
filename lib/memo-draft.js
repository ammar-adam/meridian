/** Skeleton memo from scrape — shown while Claude finishes the full brief. */
export function buildDraftMemoFromScrape(scraped, fundContext = {}) {
  const title = scraped?.ogTitle?.trim() || scraped?.domain || 'Company'
  const initial = (title[0] || '?').toUpperCase()
  const tagline = scraped?.ogDescription?.trim()
    ? scraped.ogDescription.split(/[.!?]/)[0].toLowerCase() + '.'
    : 'brief in progress.'
  const date = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const fundName = fundContext.fundFooterName || fundContext.fundName || 'Fund'

  return {
    COMPANY_NAME: title.replace(/\s*[|\-–].*$/, '').trim() || title,
    COMPANY_INITIAL: initial,
    COMPANY_TAGLINE: tagline,
    COMPANY_LOGO_URL: scraped?.favicon || '',
    FUND_NAME: fundName,
    FUND_LOGO_URL: fundContext.fundLogoUrl || '',
    HERO_IMAGE_URL: scraped?.ogImage || '',
    ROUND: 'Undisclosed',
    DATE: date,
    PRODUCT_DESCRIPTION: scraped?.ogDescription || 'Generating product section…',
    MARKET_DESCRIPTION: 'Generating market section…',
    STAT_1_VALUE: '—',
    STAT_1_LABEL: 'Pending',
    STAT_2_VALUE: '—',
    STAT_2_LABEL: 'Pending',
    STAT_3_VALUE: '—',
    STAT_3_LABEL: 'Pending',
    DEFENSE_1_TITLE: 'Pending',
    DEFENSE_1_TEXT: 'Generating…',
    DEFENSE_2_TITLE: 'Pending',
    DEFENSE_2_TEXT: 'Generating…',
    TEAM_1_INITIALS: '—',
    TEAM_1_ROLE: 'Pending',
    TEAM_1_NAME: 'Undisclosed',
    TEAM_1_BIO: 'Generating team section…',
    TEAM_2_INITIALS: '—',
    TEAM_2_ROLE: 'Pending',
    TEAM_2_NAME: 'Undisclosed',
    TEAM_2_BIO: '—',
    TEAM_3_INITIALS: '—',
    TEAM_3_ROLE: 'Pending',
    TEAM_3_NAME: 'Undisclosed',
    TEAM_3_BIO: '—',
    PORTFOLIO_INTRO: 'Generating portfolio fit…',
    PORTFOLIO_ITEMS: '',
    FUND_ANGLE_LABEL: `The ${fundName} Angle`,
    THESIS_HEADLINE: 'Generating fund-specific thesis…',
    THESIS_1_TITLE: 'Pending',
    THESIS_1_TEXT: 'Generating…',
    THESIS_2_TITLE: 'Pending',
    THESIS_2_TEXT: 'Generating…',
    THESIS_3_TITLE: 'Pending',
    THESIS_3_TEXT: 'Generating…',
  }
}

export const MEMO_GENERATING_KEY = 'meridian_generating'
export const MEMO_PENDING_BRIEF_KEY = 'meridian_pending_brief'
export const MEMO_GENERATE_INFLIGHT_KEY = 'meridian_generate_inflight'
