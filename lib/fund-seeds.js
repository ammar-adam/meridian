import {
  addFund,
  ensureActiveFund,
  getActiveFundId,
  getAllFunds,
  getFundProfile,
  saveFundProfile,
  setActiveFundId,
} from '@/lib/fund-profile'

const SEED_MARKER_KEY = 'meridian_fund_seeds_applied'

export const SAGARD_AI_FUND = {
  id: 'sagard_ai_fund',
  fundName: 'Sagard AI Fund',
  fundWebsiteUrl: 'https://www.sagard.com',
  thesis: `Sagard AI Fund is a $150M venture fund backing commercial-stage AI companies
    where enterprise distribution and vertical domain expertise create durable moats.
    Focus on applied AI in regulated and operationally complex industries — healthcare,
    financial services, industrials, and legal — where model quality alone is not
    enough and go-to-market depth matters. Writes Series A and B checks in North
    America and Europe, partnering with founders who can translate research into
    revenue with measurable customer outcomes.`,
  outreachTone: `Lead with domain-specific insight, not AI hype. Reference Sagard's portfolio
    only when there is a genuine customer, partner, or GTM parallel. Tone is senior and
    direct — we are operators first, not tourists in AI.`,
  mandate: {
    stages: ['Series A', 'Series B'],
    geographies: ['North America', 'Europe'],
    sectors: ['enterprise AI', 'vertical AI', 'healthcare AI', 'fintech AI', 'industrials'],
  },
  memoTemplateId: 'default',
  strategies: [{
    id: 'primary',
    name: 'Sagard AI Fund',
    thesis: `Sagard AI Fund is a $150M venture fund backing commercial-stage AI companies
      where enterprise distribution and vertical domain expertise create durable moats.`,
    portfolio: [
      { name: 'Cohere', domain: 'cohere.com', description: 'Enterprise LLM platform' },
      { name: 'Ada', domain: 'ada.cx', description: 'AI customer service automation' },
      { name: 'Element AI alumni network', domain: '', description: 'Montreal AI ecosystem' },
    ],
    mandate: {
      stages: ['Series A', 'Series B'],
      geographies: ['North America', 'Europe'],
      sectors: ['enterprise AI', 'vertical AI'],
    },
  }, {
    id: 'growth',
    name: 'Growth / Series B+',
    thesis: `Sagard backs later commercial AI companies with proven enterprise revenue —
      Series B and beyond — where distribution moats and vertical depth already show.`,
    portfolio: [
      { name: 'Cohere', domain: 'cohere.com', description: 'Enterprise LLM platform' },
    ],
    mandate: {
      stages: ['Series B', 'Growth'],
      geographies: ['North America', 'Europe'],
      sectors: ['enterprise AI', 'vertical AI'],
    },
  }],
}

export const PANACHE_VENTURES = {
  id: 'panache_ventures',
  fundName: 'Panache Ventures',
  thesis: `Panache Ventures is Canada's most active pre-seed and seed-stage
    venture capital fund, writing first checks between $100K-$1.5M. Based in
    Toronto with offices in Montreal, Calgary, and Vancouver. Focus sectors:
    enterprise software, AI/ML, fintech, blockchain, digital health, climate
    tech. Backs technical founders at the earliest stages, often as the first
    institutional investor on the cap table. Strong emphasis on Canadian
    founders and the Canadian tech ecosystem, with a Silicon Valley bridge
    via their Commonwealth Ventures acquisition for follow-on fundraising
    support. Explicitly positions against larger US funds by offering speed,
    intimacy, and hands-on founder support rather than brand prestige alone.`,
  outreachTone: `Panache competes against better-known US funds for founder
    attention, so outreach must lead with specific, credible value: speed of
    decision-making, hands-on support, warm intros to Canadian ecosystem
    players, and genuine familiarity with the founder's specific market. Never
    lead with fund size or brand. Reference the Canadian angle only if it's
    genuinely relevant to the founder's business, not as a default hook.`,
  mandate: {
    stages: ['pre-seed', 'seed'],
    geographies: ['Canada'],
    sectors: ['enterprise software', 'AI/ML', 'fintech', 'blockchain', 'digital health', 'climate tech'],
  },
  memoTemplateId: 'compact',
  strategies: [{
    id: 'primary',
    name: 'First check',
    thesis: `Panache Ventures backs technical Canadian founders at pre-seed and seed with
      $100K-$1.5M first checks — speed, intimacy, and hands-on support vs larger US brands.`,
    portfolio: [
      { name: 'Neo Financial', domain: 'neo.ca', description: 'Canadian fintech' },
      { name: 'Hopper', domain: 'hopper.com', description: 'Travel fintech, Montreal' },
      { name: 'Vention', domain: 'vention.io', description: 'Manufacturing automation' },
    ],
    mandate: {
      stages: ['pre-seed', 'seed'],
      geographies: ['Canada'],
      sectors: ['enterprise software', 'AI/ML', 'fintech'],
    },
  }, {
    id: 'follow_on',
    name: 'Follow-on',
    thesis: `Panache follow-on capital for Canadian portfolio companies raising the next round —
      still thesis-aligned to enterprise software, AI/ML, fintech, and climate.`,
    portfolio: [
      { name: 'Neo Financial', domain: 'neo.ca', description: 'Canadian fintech' },
      { name: 'Hopper', domain: 'hopper.com', description: 'Travel fintech, Montreal' },
    ],
    mandate: {
      stages: ['seed', 'Series A'],
      geographies: ['Canada'],
      sectors: ['enterprise software', 'AI/ML', 'fintech'],
    },
  }],
}

const CANNED = {
  [PANACHE_VENTURES.id]: PANACHE_VENTURES,
  [SAGARD_AI_FUND.id]: SAGARD_AI_FUND,
}

/** Upgrade canned demo firms with multi-vehicle strategies without clobbering user edits. */
function syncCannedVehicles() {
  const keepActiveId = getActiveFundId()
  for (const [id, seed] of Object.entries(CANNED)) {
    const existing = getFundProfile(id)
    if (!existing) continue
    // Only upgrade demo seeds that still have a single stock vehicle.
    if (existing.strategies?.length === 1 && seed.strategies.length > 1) {
      saveFundProfile({
        ...existing,
        strategies: seed.strategies,
        activeStrategyId: existing.activeStrategyId || seed.strategies[0].id,
      })
    }
  }
  // saveFundProfile activates the saved fund — restore the user's firm
  if (keepActiveId) setActiveFundId(keepActiveId)
}

/** Seed fund profiles when localStorage is empty.
 *  Seeds Sagard + Panache, activates Panache once on first visit only.
 *  Never re-locks the firm after the user switches. */
export function seedFundProfilesIfEmpty() {
  if (typeof localStorage === 'undefined') return false

  if (!localStorage.getItem(SEED_MARKER_KEY) && getAllFunds().length === 0) {
    addFund(SAGARD_AI_FUND, { activate: false })
    addFund(PANACHE_VENTURES, { activate: false })
    setActiveFundId(PANACHE_VENTURES.id)
    localStorage.setItem(SEED_MARKER_KEY, '1')
  } else if (getAllFunds().length > 0) {
    localStorage.setItem(SEED_MARKER_KEY, '1')
    syncCannedVehicles()
  }

  // Only fills a missing/invalid activeFundId — does not override a user's choice.
  const active = ensureActiveFund()
  if (active && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('meridian-context-change'))
  }
  return Boolean(active)
}
