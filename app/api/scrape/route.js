import { enforceRateLimit } from '@/lib/api-guard'
import { runScrape } from '@/lib/scrape-core'

export const maxDuration = 30

export async function POST(req) {
  const limited = enforceRateLimit(req, 'scrape')
  if (limited) return limited

  const { url: rawUrl, forceRegenerate } = await req.json()

  try {
    const result = await runScrape(rawUrl, { forceRegenerate })
    console.log('[scrape]', rawUrl, result.domain)
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to fetch URL' }, { status: 400 })
  }
}
