import { extractDomain } from '@/lib/url-utils'

const CONFIDENCE_ORDER = { found: 3, partial: 2, not_found: 1 }

/**
 * Each pass is a narrowly scoped Perplexity query targeting one memo section.
 */
export function buildResearchPasses(url, companyName, scraped) {
  const domain = extractDomain(url) || (() => {
    try { return new URL(url).hostname } catch { return url }
  })()
  const name = companyName?.trim() || scraped?.ogTitle?.trim() || domain

  return {
    product: {
      query: `What does ${name} (${domain}) actually build? Describe
        their specific product features, what problem it solves, and how
        customers use it. Be specific about functionality, not marketing
        language. If they have multiple products, name each one.`,
      section: 'product',
    },

    funding: {
      query: `What is ${name}'s (${domain}) funding history? Include:
        total amount raised, most recent round stage and size, date of most
        recent round, and names of lead investors. If this information is
        not publicly available, state clearly that no funding has been
        publicly disclosed rather than guessing.`,
      section: 'funding',
    },

    team: {
      query: `Who founded ${name} (${domain})? For each founder,
        find: full name, current role/title, and what they did immediately
        before this company — previous company, role, and any notable
        outcome (acquisition, exit, prior startup). Search LinkedIn,
        Crunchbase, and press coverage specifically for founder backgrounds,
        not just the company's About page.`,
      section: 'team',
    },

    market: {
      query: `What market does ${name} (${domain}) operate in? Find
        a specific total addressable market size figure with a source if
        possible, key market trends or tailwinds relevant to this company,
        and who their target customers are. Prefer specific dollar figures
        over vague market descriptions.`,
      section: 'market',
    },

    defensibility: {
      query: `What makes ${name} (${domain}) hard to replicate or
        compete with? Look for: proprietary data or technology, network
        effects, switching costs for customers, exclusive partnerships or
        contracts, regulatory moats, or unique team expertise. Be specific
        about the mechanism, not generic claims of "strong product."`,
      section: 'defensibility',
    },

    news: {
      query: `What has ${name} (${domain}) announced or been covered
        for in the last 12 months? Include product launches, partnerships,
        notable hires, or press coverage. If nothing recent is found, state
        that clearly.`,
      section: 'news',
    },
  }
}

/** Quick/auto → 3 memo-critical passes; deep → all six; instant → none */
export function selectPassesForMode(mode, allPasses) {
  if (mode === 'instant') return []
  if (mode === 'deep') return Object.values(allPasses)
  return [allPasses.product, allPasses.funding, allPasses.team]
}

/**
 * Heuristic confidence from Perplexity response text.
 */
export function assessConfidence(content, section) {
  void section
  if (!content || content.length < 50) return 'not_found'

  const notFoundPhrases = [
    /no (public|publicly available) information/i,
    /not (publicly )?disclosed/i,
    /could not find/i,
    /no information (was |is )?available/i,
    /unable to (find|locate)/i,
    /nothing recent is found/i,
  ]
  if (notFoundPhrases.some(re => re.test(content))) return 'not_found'

  const hedgePhrases = [
    /it (appears|seems) that/i,
    /may (be|have)/i,
    /reportedly/i,
    /unconfirmed/i,
  ]
  const hedgeCount = hedgePhrases.filter(re => re.test(content)).length
  if (hedgeCount >= 2) return 'partial'

  return 'found'
}

export function buildTeamEscalationQuery(companyName, domain, initialFindings) {
  return {
    query: `Search specifically for the founder or founding team of
      ${companyName} (${domain}) on LinkedIn and Crunchbase. Look for
      any press release, TechCrunch/BetaKit/local tech press coverage
      announcing their funding round, which often names founders even
      when the company website doesn't. Also check Product Hunt if this
      looks like a product launch. Previous findings: "${(initialFindings || '').slice(0, 400)}"
      — if you can add anything beyond this, do so.`,
    section: 'team_escalation',
  }
}

export function formatPassesForSynthesis(passes) {
  if (!passes?.length) return ''
  return passes
    .map(p => `### ${p.section.toUpperCase()} [confidence: ${p.confidence}]\n${p.content}`)
    .join('\n\n')
}

export function mergePassesToLegacyString(passes) {
  if (!passes?.length) return ''
  return passes
    .map(p => `## ${p.section}\n${p.content}`)
    .join('\n\n')
}

export function confidenceRank(confidence) {
  return CONFIDENCE_ORDER[confidence] ?? 0
}

/** Prefer escalated team content when confidence improves */
export function mergeTeamEscalation(passes, escalated) {
  if (!escalated?.content) return passes
  const idx = passes.findIndex(p => p.section === 'team')
  if (idx < 0) return [...passes, { ...escalated, section: 'team' }]

  const current = passes[idx]
  if (confidenceRank(escalated.confidence) <= confidenceRank(current.confidence)) {
    return passes
  }

  const merged = [...passes]
  merged[idx] = {
    section: 'team',
    content: `${current.content}\n\n--- Additional team research ---\n${escalated.content}`,
    confidence: escalated.confidence,
    escalated: true,
  }
  return merged
}

/** Normalize legacy string-only prefetch into full research result */
export function normalizeResearchResult(raw) {
  if (!raw) return { research: '', passes: [], passCount: 0 }
  if (typeof raw === 'string') {
    return { research: raw, passes: [], passCount: 0 }
  }
  return {
    research: raw.research ?? mergePassesToLegacyString(raw.passes) ?? '',
    passes: raw.passes ?? [],
    passCount: raw.passCount ?? raw.passes?.length ?? 0,
    cached: raw.cached,
    instant: raw.instant,
  }
}
