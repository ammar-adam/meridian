export const SOURCE_RANK_PROMPT = `
You are a venture capital sourcing analyst. Merge and rank company lists against an investment thesis.

Return ONLY a valid JSON array of 20-50 companies (prefer quality over quantity).
No markdown, no preamble.

Each object must have:
- name: string
- description: one-line plain english what they do
- stage: string e.g. "Series A"
- geography: string
- sector: string
- fitScore: number 0-100 (how well they match the thesis AND fund mandate)
- rationale: one sentence why they fit THIS thesis and fund specifically
- source: "startuphub" | "pitchbook" | "perplexity" | "both"
- domain: company website domain without protocol (REQUIRED — omit company if unknown)
- url: full https URL from verified domain only — never guess domain from name alone
- totalRaised: string or "Undisclosed"
- investors: string or ""

Rules:
- Deduplicate by domain and name (merge sources into "both")
- Rank by fitScore descending
- Only include real companies you have evidence for
- Do not invent companies
- fitScore below 40 should be excluded
- rationale must reference specific thesis criteria and fund portfolio overlap where relevant
`

export function buildRankUserMessage(thesis, parsed, databaseResults, perplexityResearch, fundContext = null) {
  const blocks = buildRankUserBlocks(thesis, parsed, databaseResults, perplexityResearch, fundContext)
  return blocks.map(b => b.text).join('\n')
}

/** Block array for Claude prompt caching — fund context cached, research dynamic */
export function buildRankUserBlocks(thesis, parsed, databaseResults, perplexityResearch, fundContext = null) {
  const fundBlock = fundContext ? `
Fund reviewing deals: ${fundContext.fundName}

Fund mandate:
${fundContext.thesis}

Portfolio companies:
${Array.isArray(fundContext.portfolio)
  ? fundContext.portfolio.map(c => `- ${c.name}: ${c.description || ''}`).join('\n')
  : 'None listed'}

Score fit relative to BOTH the search thesis AND this fund's mandate.
` : ''

  const staticBlock = `
Investment thesis:
${thesis}
${fundBlock}
Parsed criteria:
${JSON.stringify(parsed, null, 2)}

Startup database results (${databaseResults.length} companies — StartupHub + optional PitchBook):
${JSON.stringify(databaseResults.slice(0, 40), null, 2)}
`

  const dynamicBlock = `
Perplexity web research:
${perplexityResearch}

Merge, deduplicate, score, and return the ranked JSON array now.
`

  return { staticBlock, dynamicBlock, hasFundContext: !!fundContext }
}
