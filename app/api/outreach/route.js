import { enforceRateLimit } from '@/lib/api-guard'
import { callAnthropic } from '@/lib/anthropic'
import { buildOutreachPrompt } from '@/lib/outreach-prompt'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'

export const maxDuration = 60

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

function parseOutreachJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]+\}/)
    return match ? JSON.parse(match[0]) : null
  }
}

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'outreach')
  if (limited) return limited

  const { memoData, fundContext, founderName } = await req.json()

  if (!memoData?.COMPANY_NAME) {
    return Response.json({ error: 'Memo data is required' }, { status: 400 })
  }

  const ctx = fundContext?.fundName ? fundContext : GUEST_FUND_API_CONTEXT

  const userMessage = `
Company: ${memoData.COMPANY_NAME}
Product: ${stripHtml(memoData.PRODUCT_DESCRIPTION)}
Market: ${memoData.MARKET_DESCRIPTION}
Team: ${memoData.TEAM_1_NAME} (${memoData.TEAM_1_ROLE}) — ${stripHtml(memoData.TEAM_1_BIO)}
Defensibility: ${memoData.DEFENSE_1_TITLE} — ${stripHtml(memoData.DEFENSE_1_TEXT)}
Why this fund cares: ${memoData.THESIS_HEADLINE} — ${stripHtml(memoData.THESIS_1_TEXT)}

Founder name (if known): ${founderName || 'unknown, use "Hi there"'}

Write the outreach email now.
  `.trim()

  try {
    const { text } = await callAnthropic({
      system: buildOutreachPrompt(ctx),
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1000,
      cacheSystem: true,
    })

    const outreach = parseOutreachJson(text)
    if (!outreach?.subject || !outreach?.body) {
      return Response.json({ error: 'Failed to generate outreach' }, { status: 500 })
    }

    return Response.json({ outreach })
  } catch (err) {
    console.error('[outreach]', err.message)
    return Response.json({ error: err.message || 'Failed to generate outreach' }, { status: 500 })
  }
}
