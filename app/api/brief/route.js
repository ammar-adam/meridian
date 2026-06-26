import { enforceRateLimit } from '@/lib/api-guard'
import { runBriefPipeline } from '@/lib/memo-pipeline-server'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'

export const maxDuration = 300

export async function POST(req) {
  const limited = enforceRateLimit(req, 'brief')
  if (limited) return limited

  const body = await req.json()
  const {
    url,
    fundContext,
    sourceContext,
    learningContext,
    forceRegenerate,
    researchMode,
    scrapeOnly,
    scraped,
    retryResearch,
  } = body

  if (!url?.trim()) {
    return Response.json({ error: 'URL is required' }, { status: 400 })
  }

  const result = await runBriefPipeline({
    url,
    fundContext: fundContext || GUEST_FUND_API_CONTEXT,
    sourceContext: sourceContext || null,
    learningContext: learningContext || null,
    forceRegenerate: !!forceRegenerate,
    researchMode: researchMode || 'quick',
    scrapeOnly: !!scrapeOnly,
    scraped: scraped || null,
    retryResearch: !!retryResearch,
  })

  if (result.error) {
    const status = result.failedStep === 'scrape' ? 400 : 500
    return Response.json(result, { status })
  }

  return Response.json(result)
}
