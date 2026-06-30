import { MODELS } from '@/lib/api-models'
import { callAnthropic, textBlock } from '@/lib/anthropic'

const PARSE_SYSTEM = 'Parse an investment thesis into search parameters. Return ONLY valid JSON, no markdown.'

/**
 * Uses Claude to parse natural-language thesis into structured search params.
 */
export async function parseThesis(thesis, _apiKey, fundContext = null) {
  const fundBlock = fundContext ? `
Fund context (${fundContext.fundName}):
${fundContext.thesis}

Portfolio: ${Array.isArray(fundContext.portfolio)
  ? fundContext.portfolio.map(c => c.name).join(', ')
  : ''}

Bias search parameters toward this fund's mandate and portfolio overlap.
` : ''

  const year = new Date().getFullYear()
  const queryBlock = `
Parse this thesis into search parameters:

"${thesis}"

Return JSON:
{
  "sectors": ["string"],
  "stages": ["Seed", "Series A", etc.],
  "geographies": ["North America", etc.],
  "keywords": ["string"],
  "fundingMin": number or null,
  "fundingMax": number or null,
  "foundedAfter": year number or null,
  "pitchbookQuery": "concise search string for startup database (StartupHub)",
  "perplexityQuery": "detailed web research query — must ask for at least 20 real startups with name, domain, stage, funding, HQ for ${year}"
}`

  const content = fundBlock
    ? [textBlock(fundBlock, { cache: true }), textBlock(queryBlock)]
    : queryBlock

  const { text: raw } = await callAnthropic({
    system: PARSE_SYSTEM,
    maxTokens: 1024,
    messages: [{ role: 'user', content }],
  })

  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]+\}/)
    return match ? JSON.parse(match[0]) : null
  }
}
