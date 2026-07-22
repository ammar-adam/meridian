import { isClerkEnabled } from '@/lib/auth-server'
import { isDbEnabled } from '@/lib/db/workspace'
import { isShareEnabled } from '@/lib/share-store'
import { isStartupHubConfigured, verifyStartupHub } from '@/lib/startuphub'
import { isPitchbookConfigured } from '@/lib/pitchbook'
import { isServerPdfEnabled } from '@/lib/pdf-config'
import { isCronAuthorized, shapePublicHealth } from '@/lib/health-payload'
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

/**
 * Public: { ok, features } only — user-facing capability booleans, no config
 * detail. Full operator payload (pings, key presence, auth mode, provider
 * flags) requires Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req) {
  const quick = new URL(req.url).searchParams.get('quick') === '1'
  const authorized = isCronAuthorized(
    req.headers.get('authorization') || '',
    process.env.CRON_SECRET,
  )

  const pdfEnabled = isServerPdfEnabled()
  const db = isDbEnabled()
  const clerk = isClerkEnabled()
  const startuphubConfigured = isStartupHubConfigured()
  const anthropicKeyPresent = !!process.env.ANTHROPIC_API_KEY
    && process.env.ANTHROPIC_API_KEY !== 'your_key_here'
  const perplexityKeyPresent = !!process.env.PERPLEXITY_API_KEY
    && process.env.PERPLEXITY_API_KEY !== 'your_key_here'
  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  const clerkMode = clerkPk.startsWith('pk_live_') ? 'production' : clerkPk ? 'development' : 'none'

  const features = {
    aiGeneration: anthropicKeyPresent,
    deepResearch: perplexityKeyPresent,
    persistence: db,
    indexChecks: startuphubConfigured,
    auth: clerk && clerkMode === 'production',
    serverPdf: pdfEnabled,
    shareLinks: isShareEnabled(),
    cloudSync: db && clerk,
    flowDigest: true,
    coverageProof: true,
    tier0Signals: db,
    founderClaims: db,
    companyRecords: db,
  }

  if (!authorized) {
    return Response.json(shapePublicHealth({ ok: true, features }))
  }

  const startuphubStatus = startuphubConfigured ? await verifyStartupHub() : { configured: false, ok: false }
  const anthropicPing = anthropicKeyPresent && !quick ? await pingAnthropic() : null
  const anthropicSonnetPing = anthropicKeyPresent && !quick ? await pingAnthropicSonnet() : null

  return Response.json({
    ok: true,
    anthropic: anthropicKeyPresent && (quick || (anthropicPing?.ok === true && anthropicSonnetPing?.ok === true)),
    anthropicKeyPresent,
    anthropicPing,
    anthropicSonnetPing,
    perplexity: perplexityKeyPresent,
    startuphub: startuphubConfigured && startuphubStatus.ok,
    startuphubConfigured,
    pitchbook: isPitchbookConfigured(),
    pitchbookConfigured: isPitchbookConfigured(),
    database: db,
    clerk,
    clerkMode,
    clerkDemoRisk: clerkMode === 'development',
    slackDigest: Boolean(process.env.SLACK_WEBHOOK_URL?.trim()),
    features,
  })
}
