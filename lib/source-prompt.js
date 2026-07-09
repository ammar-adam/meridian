export const SOURCE_RANK_PROMPT = `
You are a venture capital sourcing analyst. Score and rank a merged candidate list against an investment thesis.

Return ONLY a valid JSON array of 15-35 companies. No markdown, no preamble.

Each object must have:
- name: string
- description: one-line plain english what they do
- stage: string e.g. "Series A"
- geography: string
- sector: string
- fitScore: number 0-100 (how well they match the thesis AND fund mandate)
- rationale: one sentence why they fit THIS thesis and fund specifically — cite thesis keywords or portfolio overlap
- source: "startuphub" | "pitchbook" | "perplexity" | "canadian_web" | "stealth_signal" | "evertrace" | "domain_registry" | "incubator" | "grant" | "event_host" | "both"
- unverified: boolean (true for stealth_signal / evertrace / domain_registry — weak or pre-announcement leads)
- provenance: optional human-readable string from community sources (e.g. "Velocity May 2026 cohort") — preserve when present
- domain: company website domain without protocol (REQUIRED when known; incubator/grant rows may lack domain)
- url: full https URL from verified domain only — never guess domain from name alone
- totalRaised: string or "Undisclosed"
- investors: string or ""

Rules:
- START with every company in the database results list — score each one (do not drop database companies)
- Prefer high-confidence community sources (incubator) over low-confidence domain_registry when scoring
- Add strong Perplexity discoveries not already in the database list
- When Canadian web research or stealth signal sections are present, include strong Canadian matches and mark stealth rows source "stealth_signal" with unverified: true
- Preserve provenance strings from incubator / grant / domain_registry / event_host seeds
- Deduplicate by domain and name (merge sources into "both", keep strongest provenance)
- Rank by fitScore descending
- Only include real companies with evidence in the inputs
- Do not invent companies or domains
- Spread fitScores: top matches 75-95, solid 60-74, exploratory 45-59
- rationale must reference specific thesis criteria and fund portfolio overlap where relevant
- Target at least 15 companies in the output when inputs support it
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

Startup database + community source results (${databaseResults.length} companies — StartupHub, PitchBook, incubator, grant, domain registry, event hosts):
${JSON.stringify(databaseResults.slice(0, 60), null, 2)}
`

  const dynamicBlock = `
Perplexity web research:
${perplexityResearch}

Score every database company, add strong Perplexity matches, deduplicate, and return the ranked JSON array now.
`

  return { staticBlock, dynamicBlock, hasFundContext: !!fundContext }
}
