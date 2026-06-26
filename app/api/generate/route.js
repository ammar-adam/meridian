import { enforceRateLimit } from '@/lib/api-guard'
import { runGenerate } from '@/lib/generate-core'

export const maxDuration = 120

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'generate')
  if (limited) return limited

  const { research, scraped, fundContext, sourceContext, learningContext, forceRegenerate, researchMode } = await req.json()

  if (!fundContext?.fundName) {
    return Response.json({ error: 'Fund profile is required' }, { status: 400 })
  }

  try {
    const result = await runGenerate({
      research,
      scraped,
      fundContext,
      sourceContext,
      learningContext,
      forceRegenerate,
      researchMode: researchMode || 'auto',
    })
    console.log('[generate] memo for', result.memoData?.COMPANY_NAME, 'qg:', result.qualityGate?.passed)
    return Response.json(result)
  } catch (err) {
    console.error('[generate]', err.message)
    return Response.json({ error: err.message || 'Generate failed' }, { status: 500 })
  }
}
