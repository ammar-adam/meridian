/**
 * NationGraph-quality demo brief — zero API cost, instant proof for new users.
 */
import { logOutcome } from '@/lib/edit-tracker'
import { saveMemo } from '@/lib/memo-library'

const DEMO_SEED_KEY = 'meridian_demo_seeded'
export const DEMO_MEMO_ID = 'demo_nationgraph'

export const nationgraphDemoMemo = {
  COMPANY_NAME: 'NationGraph',
  COMPANY_INITIAL: 'N',
  COMPANY_TAGLINE: 'ai-powered procurement intelligence for companies selling to government.',
  COMPANY_LOGO_URL: '',
  HERO_IMAGE_URL: 'https://cdn.prod.website-files.com/6793d08a2ddbc36e142ee6a0/67b6564a06204517a02640f1_N%20Opengraph.png',
  ROUND: 'Series A',
  DATE: 'June 2026',
  PRODUCT_DESCRIPTION:
    '<strong>NationGraph</strong> aggregates fragmented public-sector procurement data — RFPs, meeting minutes, budget documents, and contact graphs — into a searchable intelligence layer. Sales teams use it to predict which agencies are about to buy, who the decision-makers are, and which incumbents are vulnerable. The platform monitors 90,000+ government entities and surfaces buying signals weeks before formal RFPs drop.',
  MARKET_DESCRIPTION:
    'State and local governments spend over $160B annually on IT and professional services, yet procurement data is scattered across thousands of incompatible systems. The shift to AI-assisted government sales is early — incumbents like GovWin and Deltek sell static databases while buyers want predictive intelligence. NationGraph targets the $12B+ govtech sales intelligence segment growing 18% annually as vendors invest in AI-native outbound.',
  STAT_1_VALUE: '$160B',
  STAT_1_LABEL: 'Annual state & local IT spend',
  STAT_2_VALUE: '90K+',
  STAT_2_LABEL: 'Government entities monitored',
  STAT_3_VALUE: '$18M',
  STAT_3_LABEL: 'Total raised',
  DEFENSE_1_TITLE: 'Proprietary data graph',
  DEFENSE_1_TEXT:
    'NationGraph has spent three years building a normalized graph of procurement entities, contacts, and buying patterns that cannot be replicated by scraping alone. Human-in-the-loop verification on high-value accounts creates a data moat that improves with every customer deployment.',
  DEFENSE_2_TITLE: 'Workflow lock-in',
  DEFENSE_2_TEXT:
    'Teams build daily workflows around NationGraph alerts — replacing a patchwork of manual Google Alerts, FOIA requests, and CRM notes. Switching costs rise as playbooks, saved searches, and team annotations accumulate inside the platform.',
  TEAM_1_INITIALS: 'JF',
  TEAM_1_ROLE: 'CEO',
  TEAM_1_NAME: 'Joshua Goldstein',
  TEAM_1_BIO: 'Former policy advisor and govtech operator; previously built data products for public-sector clients.',
  TEAM_2_INITIALS: 'MP',
  TEAM_2_ROLE: 'CTO',
  TEAM_2_NAME: 'Maya Patel',
  TEAM_2_BIO: 'Engineering lead with background in large-scale data pipelines and NLP on unstructured government documents.',
  TEAM_3_INITIALS: 'CM',
  TEAM_3_ROLE: 'Head of Sales',
  TEAM_3_NAME: 'Chris Morgan',
  TEAM_3_BIO: 'Enterprise sales leader with existing relationships across SLED procurement teams.',
  PORTFOLIO_INTRO:
    'NationGraph sells into government-adjacent enterprises and regulated industries — overlapping with funds focused on govtech and enterprise AI distribution.',
  PORTFOLIO_ITEMS: '',
  FUND_NAME: 'Your Fund',
  FUND_LOGO_URL: '',
  FUND_ANGLE_LABEL: 'The Your Fund Angle',
  THESIS_HEADLINE:
    'NationGraph is the predictive layer for govtech sales — a commercial AI product with enterprise distribution in a $160B procurement market.',
  THESIS_1_TITLE: 'Enterprise distribution',
  THESIS_1_TEXT:
    'Govtech vendors need intelligence before RFPs drop. NationGraph\'s alert-driven workflow maps to how enterprise sales teams already operate — a natural upsell path for portfolio companies selling into SLED.',
  THESIS_2_TITLE: 'Data moat',
  THESIS_2_TEXT:
    'The entity-contact graph compounds with usage. Each customer deployment improves signal quality — classic network-effect data defensibility in a market where incumbents sell static lists.',
  THESIS_3_TITLE: 'Mandate fit',
  THESIS_3_TEXT:
    'Commercial-stage AI with clear ROI for enterprise buyers. Series A profile with proven willingness to pay from govtech and adjacent verticals.',
}

export const EXAMPLE_COMPANIES = [
  { name: 'NationGraph', url: 'https://nationgraph.com', label: 'Govtech · demo quality' },
  { name: 'Harvey', url: 'https://harvey.ai', label: 'Legal AI' },
  { name: 'Glean', url: 'https://glean.com', label: 'Enterprise search' },
  { name: 'Sierra', url: 'https://sierra.ai', label: 'Conversational AI' },
]

function seedDemoSignalsIfNeeded() {
  if (typeof window === 'undefined' || localStorage.getItem(DEMO_SEED_KEY)) return

  saveMemo(nationgraphDemoMemo, DEMO_MEMO_ID, {
    allowDemoOverwrite: true,
    companyDomain: 'nationgraph.com',
    fundId: 'guest',
    fundName: 'Your Fund',
    trackingId: 'guest',
    outcome: 'pursue',
    qualityPassed: true,
  })

  logOutcome({
    memoId: DEMO_MEMO_ID,
    companyName: nationgraphDemoMemo.COMPANY_NAME,
    fundName: 'Your Fund',
    trackingId: 'guest',
    outcome: 'pursue',
    source: 'demo',
    sector: 'govtech',
    stage: 'Series A',
  })

  logOutcome({
    memoId: 'demo_harvey_pass',
    companyName: 'Harvey',
    fundName: 'Your Fund',
    trackingId: 'guest',
    outcome: 'pass',
    source: 'demo',
    sector: 'legal AI',
    stage: 'Series B',
  })

  localStorage.setItem(DEMO_SEED_KEY, '1')
  window.dispatchEvent(new Event('meridian-context-change'))
}

export function openDemoMemo(router) {
  sessionStorage.setItem('memoData', JSON.stringify(nationgraphDemoMemo))
  sessionStorage.setItem('memoSource', 'demo')
  sessionStorage.setItem('memoId', DEMO_MEMO_ID)
  sessionStorage.removeItem('qualityGate')
  sessionStorage.setItem('memoMeta', JSON.stringify({ isDemo: true, companyDomain: 'nationgraph.com' }))
  seedDemoSignalsIfNeeded()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meridian-demo-opened'))
  }
  router?.push('/memo')
}
