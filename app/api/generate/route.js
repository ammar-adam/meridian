import { SYSTEM_PROMPT } from '@/lib/system-prompt'

export async function POST(req) {
  const { research, scraped, fundContext } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const userMessage = `
Here is the raw research on the company:

${research}

Here is additional data scraped from their website:
- Title: ${scraped.ogTitle}
- Description: ${scraped.ogDescription}
- Domain: ${scraped.domain}

The fund reviewing this deal is: ${fundContext.fundName}
Fund thesis and portfolio context: ${fundContext.thesis}

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
      system: SYSTEM_PROMPT,
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

  memoData.FUND_NAME = fundContext.fundName
  memoData.FUND_LOGO_URL = ''
  memoData.HERO_IMAGE_URL = scraped.ogImage || memoData.HERO_IMAGE_URL || ''
  memoData.COMPANY_LOGO_URL = scraped.favicon || ''

  console.log('[generate] memo for', memoData.COMPANY_NAME)

  return Response.json({ memoData })
}
