/**
 * HTML → plain text for LLM extraction.
 * Mirrors visible-text stripping used by source-watch (scripts/styles out, tags → space).
 */
export function htmlToVisibleText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Strip markdown fences and parse JSON from an LLM response.
 * Exported for unit tests.
 */
export function parseExtractedJson(raw) {
  let text = String(raw || '').trim()
  if (!text) return null

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) text = fenced[1].trim()

  if (!text.startsWith('{') && !text.startsWith('[')) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) text = text.slice(start, end + 1)
  }

  try {
    return JSON.parse(text)
  } catch {
    try {
      return JSON.parse(text.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      return null
    }
  }
}

/**
 * Validate and normalize extracted company rows.
 * No domain ⇒ candidate (caller must label provenance accordingly).
 */
export function validateExtractedCompanies(payload) {
  const list = Array.isArray(payload?.companies)
    ? payload.companies
    : Array.isArray(payload)
      ? payload
      : []

  const companies = []
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const name = String(row.name || '').trim()
    if (!name || name.length < 2) continue

    let domain = row.domain
      ? String(row.domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      : null
    if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) domain = null

    const founders = Array.isArray(row.founders)
      ? row.founders.map(f => String(f || '').trim()).filter(Boolean).slice(0, 8)
      : []

    companies.push({
      name,
      domain: domain || null,
      candidate: !domain,
      founders,
      program: row.program ? String(row.program).trim() : null,
      cohort_date: row.cohort_date || row.cohortDate || null,
      one_liner: row.one_liner || row.oneLiner || null,
      geography: row.geography || null,
      stage: row.stage || null,
      evidence_quote: row.evidence_quote || row.evidenceQuote || null,
      sectors: Array.isArray(row.sectors) ? row.sectors.map(String).filter(Boolean).slice(0, 8) : null,
    })
  }
  return companies
}

const EXTRACTION_SYSTEM = `You extract startup/company announcements from web page text.
Return ONLY valid JSON matching this schema (no markdown, no commentary):
{
  "companies": [
    {
      "name": "string (required)",
      "domain": "string or null (company website hostname only, e.g. example.com)",
      "founders": ["string"],
      "program": "string or null",
      "cohort_date": "YYYY-MM or YYYY-MM-DD or null",
      "one_liner": "string or null",
      "geography": "string or null",
      "stage": "string or null",
      "sectors": ["string"],
      "evidence_quote": "short verbatim quote from the text supporting this company"
    }
  ]
}
Rules:
- Only include real companies/startups clearly mentioned as participants, portfolio, cohort, or launches.
- Never invent domains. If unknown, set domain to null.
- Prefer specific product companies over the host incubator/university itself.
- Max 40 companies. If none found, return {"companies":[]}.`

/**
 * Fetch is caller's job. Given HTML, strip + Haiku-extract companies.
 */
export async function extractEntitiesFromHtml(html, { url = '', sourceLabel = '' } = {}) {
  const { callAnthropic } = await import('@/lib/anthropic')
  const { MODELS } = await import('@/lib/api-models')

  const text = htmlToVisibleText(html)
  const rawTextLength = text.length
  const clipped = text.slice(0, 48_000)

  if (clipped.length < 80) {
    return { companies: [], rawTextLength, model: null, skipped: true, reason: 'too_little_text' }
  }

  const userPrompt = `Source: ${sourceLabel || 'unknown'}
URL: ${url || 'unknown'}

Page text:
---
${clipped}
---`

  const { text: raw, model } = await callAnthropic({
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4096,
    cacheSystem: true,
    model: MODELS.claudeFast,
  })

  const parsed = parseExtractedJson(raw)
  const companies = validateExtractedCompanies(parsed)
  return { companies, rawTextLength, model, raw }
}
