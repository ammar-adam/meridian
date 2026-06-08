import { buildSystemPrompt } from '@/lib/system-prompt'
import { runQualityGate } from '@/lib/quality-gate'

const INDUSTRY_IMAGES = {
  fintech: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
  health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
  enterprise: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  government: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
}

export async function POST(req) {
  const { research, scraped, fundContext } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const portfolioSummary = Object.entries(fundContext.portfolio ?? {})
    .map(([arm, companies]) =>
      `${arm}: ${companies.map(c => `${c.name} (${c.description})`).join(', ')}`
    )
    .join('\n')

  const userMessage = `
Here is the raw research on the company:

${research}

Here is additional data scraped from their website:
- Title: ${scraped.ogTitle}
- Description: ${scraped.ogDescription}
- Domain: ${scraped.domain}

The fund reviewing this deal is: ${fundContext.fundName}

Fund thesis:
${fundContext.thesis}

Portfolio companies:
${portfolioSummary}

Thesis writing instructions:
${fundContext.thesisInstructions}

Generate the memo JSON now.
  `

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: buildSystemPrompt(fundContext),
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[generate] Anthropic error:', err)
    return Response.json({ error: 'Claude API request failed' }, { status: 500 })
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text ?? ''

  let memoData
  try {
    memoData = JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]+\}/)
    memoData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  }

  if (!memoData) {
    return Response.json({ error: 'Failed to parse Claude response' }, { status: 500 })
  }

  memoData.FUND_NAME = fundContext.fundFooterName || fundContext.fundName
  memoData.FUND_LOGO_URL = ''
  memoData.COMPANY_LOGO_URL = scraped.favicon || ''

  const industryTag = memoData.INDUSTRY_TAG || 'default'
  const heroUrl = scraped.ogImage || INDUSTRY_IMAGES[industryTag] || INDUSTRY_IMAGES.default
  memoData.HERO_IMAGE_URL = heroUrl

  delete memoData.INDUSTRY_TAG

  const qualityGate = runQualityGate(memoData)

  console.log('[generate] memo for', memoData.COMPANY_NAME, 'qg:', qualityGate.passed)

  return Response.json({ memoData, qualityGate })
}

// TODO V1.5: /api/export route
// POST { memoHtml } → Playwright headless render → returns PDF buffer
// Deploy Playwright service on Railway (too heavy for Vercel serverless)
// Until then: window.print() from the memo page is sufficient for demos
