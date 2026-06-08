export const maxDuration = 300

export async function POST(req) {
  const { url } = await req.json()

  if (!process.env.PERPLEXITY_API_KEY) {
    return Response.json({ error: 'PERPLEXITY_API_KEY is not configured' }, { status: 500 })
  }

  const query = `
    Research the company at ${url}.
    Return detailed information about:
    1. What the product does, in plain english, including specific features
    2. The market they operate in: size, growth, tailwinds, customer types
    3. The founding team: names, roles, previous companies, notable exits or backgrounds
    4. Funding history: total raised, latest round size, round stage, lead investors, date
    5. Competitive defensibility: what makes them hard to replicate, data moats, switching costs
    6. Recent news or notable milestones in the last 12 months
    Be specific with numbers wherever possible. Do not generalize.
  `

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-deep-research',
      messages: [{ role: 'user', content: query }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[research] Perplexity error:', err)
    return Response.json({ error: 'Perplexity API request failed' }, { status: 500 })
  }

  const data = await res.json()
  const research = data.choices?.[0]?.message?.content ?? ''

  console.log('[research]', url, `${research.length} chars`)

  return Response.json({ research })
}
