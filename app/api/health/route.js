import { isClerkEnabled } from '@/lib/auth-server'
import { isDbEnabled } from '@/lib/db/workspace'
import { isShareEnabled } from '@/lib/share-store'
import { isStartupHubConfigured, verifyStartupHub } from '@/lib/startuphub'
import { isPitchbookConfigured } from '@/lib/pitchbook'
import { isServerPdfEnabled } from '@/lib/pdf-config'
import { callAnthropic } from '@/lib/anthropic'
import { MODELS } from '@/lib/api-models'

const PING_TTL_MS = 60_000
let anthropicPingCache = { at: 0, result: null }

async function pingAnthropic() {
  if (Date.now() - anthropicPingCache.at < PING_TTL_MS && anthropicPingCache.result) {
    return anthropicPingCache.result
  }
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    anthropicPingCache = {
      at: Date.now(),
      result: { ok: false, model: MODELS.claudeFast, error: 'API key not configured' },
    }
    return anthropicPingCache.result
  }
  try {
    await callAnthropic({
      model: MODELS.claudeFast,
      system: 'ping',
      maxTokens: 1,
      cacheSystem: false,
      messages: [{ role: 'user', content: 'ok' }],
    })
    anthropicPingCache = { at: Date.now(), result: { ok: true, model: MODELS.claudeFast } }
  } catch (err) {
    anthropicPingCache = {
      at: Date.now(),
      result: { ok: false, model: MODELS.claudeFast, error: err.message },
    }
  }
  return anthropicPingCache.result
}

async function pingAnthropicSonnet() {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    return { ok: false, model: MODELS.claude, error: 'API key not configured' }
  }
  try {
    const result = await callAnthropic({
      model: MODELS.claude,
      system: 'ping',
      maxTokens: 1,
      cacheSystem: false,
      messages: [{ role: 'user', content: 'ok' }],
    })
    return { ok: true, model: result.model || MODELS.claude }
  } catch (err) {
    return { ok: false, model: MODELS.claude, error: err.message }
  }
}

export async function GET(req) {
  const quick = new URL(req.url).searchParams.get('quick') === '1'
  const pdfEnabled = isServerPdfEnabled()
  const db = isDbEnabled()
  const clerk = isClerkEnabled()
  const startuphubConfigured = isStartupHubConfigured()
  const startuphubStatus = startuphubConfigured ? await verifyStartupHub() : { configured: false, ok: false }

  const anthropicKeyPresent = !!process.env.ANTHROPIC_API_KEY
    && process.env.ANTHROPIC_API_KEY !== 'your_key_here'
  const anthropicPing = anthropicKeyPresent && !quick ? await pingAnthropic() : null
  const anthropicSonnetPing = anthropicKeyPresent && !quick ? await pingAnthropicSonnet() : null
  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  const clerkMode = clerkPk.startsWith('pk_live_') ? 'production' : clerkPk ? 'development' : 'none'

  return Response.json({
    ok: true,
    anthropic: anthropicKeyPresent && (quick || (anthropicPing?.ok === true && anthropicSonnetPing?.ok === true)),
    anthropicKeyPresent,
    anthropicPing,
    anthropicSonnetPing,
    perplexity: !!process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY !== 'your_key_here',
    startuphub: startuphubConfigured && startuphubStatus.ok,
    startuphubConfigured,
    pitchbook: isPitchbookConfigured(),
    pitchbookConfigured: isPitchbookConfigured(),
    database: db,
    clerk,
    clerkMode,
    clerkDemoRisk: clerkMode === 'development',
    slackDigest: Boolean(process.env.SLACK_WEBHOOK_URL?.trim()),
    features: {
      serverPdf: pdfEnabled,
      shareLinks: isShareEnabled(),
      cloudSync: db && clerk,
      flowDigest: true,
      coverageProof: true,
    },
  })
}
