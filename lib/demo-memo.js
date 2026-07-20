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

function seedWedgeFallbacksIfNeeded() {
  if (typeof window === 'undefined') return
  for (const entry of Object.values(WEDGE_DEMO_MEMOS)) {
    saveMemo(entry.memo, entry.id, {
      allowDemoOverwrite: true,
      companyDomain: entry.domain || undefined,
      fundId: 'guest',
      fundName: 'Your Fund',
      trackingId: 'guest',
      outcome: null,
      qualityPassed: true,
    })
  }
}

export function openDemoMemo(router) {
  sessionStorage.setItem('memoData', JSON.stringify(nationgraphDemoMemo))
  sessionStorage.setItem('memoSource', 'demo')
  sessionStorage.setItem('memoId', DEMO_MEMO_ID)
  sessionStorage.removeItem('qualityGate')
  sessionStorage.setItem('memoMeta', JSON.stringify({ isDemo: true, companyDomain: 'nationgraph.com' }))
  seedDemoSignalsIfNeeded()
  seedWedgeFallbacksIfNeeded()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meridian-demo-opened'))
  }
  router?.push('/memo')
}

/** Mentor-demo wedge fallbacks — zero API cost if live Brief flakes mid-record */
export const WEDGE_DEMO_MEMOS = {
  scadable: {
    id: 'demo_scadable',
    domain: 'scadable.com',
    memo: {
      COMPANY_NAME: 'SCADABLE',
      COMPANY_INITIAL: 'S',
      COMPANY_TAGLINE: 'connect IoT hardware to cloud infrastructure in minutes.',
      COMPANY_LOGO_URL: '',
      HERO_IMAGE_URL: '',
      ROUND: 'Pre-seed',
      DATE: 'May 2026',
      PRODUCT_DESCRIPTION:
        '<strong>SCADABLE</strong> connects IoT hardware to cloud infrastructure in minutes — Velocity May 2026 cohort (founder Ali Rahbar, scadable.com). Fallback memo for recording if live Brief is slow; regenerate via Brief for latest web facts.',
      MARKET_DESCRIPTION:
        'Canadian IoT / DevTools startups often appear first on campus accelerator pages, not US-centric startup feeds. Structured cohort lists keep founders attached before press indexes them.',
      STAT_1_VALUE: 'Velocity',
      STAT_1_LABEL: 'May 2026 cohort',
      STAT_2_VALUE: 'Waterloo',
      STAT_2_LABEL: 'Ecosystem',
      STAT_3_VALUE: 'Pre-seed',
      STAT_3_LABEL: 'Stage',
      DEFENSE_1_TITLE: 'Community-sourced early signal',
      DEFENSE_1_TEXT:
        'Founder and domain come from Velocity cohort structure — not a Crunchbase scrape. That is the Meridian data wedge.',
      DEFENSE_2_TITLE: 'Mandate-native brief',
      DEFENSE_2_TEXT:
        'Thesis band below is fund-context placeholder for demo recording. Live Brief regenerates against the active fund mandate.',
      TEAM_1_INITIALS: 'AR',
      TEAM_1_ROLE: 'Founder',
      TEAM_1_NAME: 'Ali Rahbar',
      TEAM_1_BIO: 'Listed on Velocity May 2026 cohort pages.',
      TEAM_2_INITIALS: '—',
      TEAM_2_ROLE: '—',
      TEAM_2_NAME: 'Undisclosed',
      TEAM_2_BIO: 'Confirm remaining team via Brief research pass.',
      TEAM_3_INITIALS: '—',
      TEAM_3_ROLE: '—',
      TEAM_3_NAME: 'Undisclosed',
      TEAM_3_BIO: 'Confirm via LinkedIn / company site.',
      PORTFOLIO_INTRO: 'Canadian IoT / DevTools pre-seed — Waterloo depth before US tools index it.',
      PORTFOLIO_ITEMS: '',
      FUND_NAME: 'Your Fund',
      FUND_LOGO_URL: '',
      FUND_ANGLE_LABEL: 'The Your Fund Angle',
      THESIS_HEADLINE: 'SCADABLE is a Velocity-sourced Canadian pre-seed signal with a named founder and live domain.',
      THESIS_1_TITLE: 'Structured early access',
      THESIS_1_TEXT: 'Cohort provenance beats generic search for founder attribution on thin-web companies.',
      THESIS_2_TITLE: 'Geography fit',
      THESIS_2_TEXT: 'Waterloo / Canadian pre-seed — the wedge geography for Meridian Discover.',
      THESIS_3_TITLE: 'Next step',
      THESIS_3_TEXT: 'Pursue → outreach, or Refresh Brief for deep research before LP forwarding.',
    },
  },
  eventist: {
    id: 'demo_eventist',
    domain: 'eventist.ca',
    memo: {
      COMPANY_NAME: 'Eventist',
      COMPANY_INITIAL: 'E',
      COMPANY_TAGLINE: 'event operations software from a Velocity Feb 2026 cohort company.',
      COMPANY_LOGO_URL: '',
      HERO_IMAGE_URL: '',
      ROUND: 'Pre-seed',
      DATE: 'Feb 2026',
      PRODUCT_DESCRIPTION:
        '<strong>Eventist</strong> (founders Ciara Azam, Daniel Whitney · eventist.ca) is a Velocity Feb 2026 cohort company. Fallback memo for mentor-demo recording if live Brief is unavailable.',
      MARKET_DESCRIPTION:
        'Campus and accelerator companies often lack press. Meridian keeps founders attached to the company via cohort transcription.',
      STAT_1_VALUE: 'Velocity',
      STAT_1_LABEL: 'Feb 2026 cohort',
      STAT_2_VALUE: '2',
      STAT_2_LABEL: 'Named founders',
      STAT_3_VALUE: '.ca',
      STAT_3_LABEL: 'Live domain',
      DEFENSE_1_TITLE: 'Founder attribution',
      DEFENSE_1_TEXT: 'Generic search often under-attributes early Velocity companies; cohort pages do not.',
      DEFENSE_2_TITLE: 'Demo honesty',
      DEFENSE_2_TEXT: 'This is a structured fallback brief — regenerate live before sending to a GP.',
      TEAM_1_INITIALS: 'CA',
      TEAM_1_ROLE: 'Co-founder',
      TEAM_1_NAME: 'Ciara Azam',
      TEAM_1_BIO: 'Velocity Feb 2026 cohort listing.',
      TEAM_2_INITIALS: 'DW',
      TEAM_2_ROLE: 'Co-founder',
      TEAM_2_NAME: 'Daniel Whitney',
      TEAM_2_BIO: 'Velocity Feb 2026 cohort listing.',
      TEAM_3_INITIALS: '—',
      TEAM_3_ROLE: '—',
      TEAM_3_NAME: 'Undisclosed',
      TEAM_3_BIO: 'Confirm via Brief.',
      PORTFOLIO_INTRO: 'Canadian pre-seed with dual founder names and a live .ca domain.',
      PORTFOLIO_ITEMS: '',
      FUND_NAME: 'Your Fund',
      FUND_LOGO_URL: '',
      FUND_ANGLE_LABEL: 'The Your Fund Angle',
      THESIS_HEADLINE: 'Eventist shows the accuracy foil — founders + domain from Velocity, not invented stats.',
      THESIS_1_TITLE: 'Accuracy',
      THESIS_1_TEXT: 'Use this row in Discover to contrast Meridian vs Perplexity-only attribution.',
      THESIS_2_TITLE: 'Brief path',
      THESIS_2_TEXT: 'One click to mandate thesis band when fund context is set.',
      THESIS_3_TITLE: 'Wedge',
      THESIS_3_TEXT: 'Community data → Discover → Brief is the product loop for the mentor video.',
    },
  },
  innowind: {
    id: 'demo_innowind',
    domain: '',
    memo: {
      COMPANY_NAME: 'Innowind',
      COMPANY_INITIAL: 'I',
      COMPANY_TAGLINE: 'AI-controlled robotic fins improving wind energy — Velocity 2026 cohort.',
      COMPANY_LOGO_URL: '',
      HERO_IMAGE_URL: '',
      ROUND: 'Pre-seed',
      DATE: '2026',
      PRODUCT_DESCRIPTION:
        '<strong>Innowind</strong> is verified on Velocity cohort materials as improving wind energy with AI-controlled robotic fins. Fallback brief for mentor-demo cuts when live research is offline.',
      MARKET_DESCRIPTION:
        'Deep-tech cohort companies are easy to miss in US-centric startup feeds. Structured incubator seeds keep them findable.',
      STAT_1_VALUE: 'Velocity',
      STAT_1_LABEL: 'Cohort provenance',
      STAT_2_VALUE: 'Canada',
      STAT_2_LABEL: 'Geography',
      STAT_3_VALUE: 'Deep tech',
      STAT_3_LABEL: 'Sector',
      DEFENSE_1_TITLE: 'Hard-to-index company',
      DEFENSE_1_TEXT: 'Falsifiable tests showed Meridian holding structure where generic search only had a name.',
      DEFENSE_2_TITLE: 'Human skim still required',
      DEFENSE_2_TEXT: 'Incubator rows are high trust relative to registry noise — still verify before pursue.',
      TEAM_1_INITIALS: '—',
      TEAM_1_ROLE: '—',
      TEAM_1_NAME: 'Confirm via Brief',
      TEAM_1_BIO: 'Founder names may be thin on public pages — research pass fills gaps.',
      TEAM_2_INITIALS: '—',
      TEAM_2_ROLE: '—',
      TEAM_2_NAME: 'Undisclosed',
      TEAM_2_BIO: '—',
      TEAM_3_INITIALS: '—',
      TEAM_3_ROLE: '—',
      TEAM_3_NAME: 'Undisclosed',
      TEAM_3_BIO: '—',
      PORTFOLIO_INTRO: 'Canadian climate / energy deep tech from campus-adjacent cohorts.',
      PORTFOLIO_ITEMS: '',
      FUND_NAME: 'Your Fund',
      FUND_LOGO_URL: '',
      FUND_ANGLE_LABEL: 'The Your Fund Angle',
      THESIS_HEADLINE: 'Innowind is a cohort-proven Canadian deep-tech name for the accuracy beat.',
      THESIS_1_TITLE: 'Fragmented sources',
      THESIS_1_TEXT: 'Accelerator pages beat national databases for early attribution.',
      THESIS_2_TITLE: 'Discover role',
      THESIS_2_TEXT: 'Surfaces before StartupHub-style feeds care.',
      THESIS_3_TITLE: 'Recording note',
      THESIS_3_TEXT: 'Prefer live Brief when APIs are healthy; this memo is the cutaway.',
    },
  },
}

export function openWedgeDemoMemo(router, key = 'scadable') {
  const entry = WEDGE_DEMO_MEMOS[key] || WEDGE_DEMO_MEMOS.scadable
  seedWedgeFallbacksIfNeeded()
  sessionStorage.setItem('memoData', JSON.stringify(entry.memo))
  sessionStorage.setItem('memoSource', 'demo')
  sessionStorage.setItem('memoId', entry.id)
  sessionStorage.removeItem('qualityGate')
  sessionStorage.setItem('memoMeta', JSON.stringify({
    isDemo: true,
    isWedgeFallback: true,
    companyDomain: entry.domain || undefined,
  }))
  router?.push('/memo')
}

