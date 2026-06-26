import { enforceRateLimit } from '@/lib/api-guard'
import { runResearch } from '@/lib/research-core'

export const maxDuration = 300

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'research')
  if (limited) return limited

  const { url, forceRegenerate, researchMode, scraped } = await req.json()

  try {
    const result = await runResearch(url, { forceRegenerate, researchMode, scraped })
    console.log('[research]', url, `${result.research?.length || 0} chars`)
    return Response.json(result)
  } catch (err) {
    console.error('[research]', err.message)
    return Response.json({ error: err.message || 'Research failed' }, { status: 500 })
  }
}
