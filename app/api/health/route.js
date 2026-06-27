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
  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''

  return Response.json({
    ok: true,
    anthropic: anthropicKeyPresent && (quick || anthropicPing?.ok === true),
    anthropicKeyPresent,
    anthropicPing,
    perplexity: !!process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY !== 'your_key_here',
    startuphub: startuphubConfigured && startuphubStatus.ok,
    startuphubConfigured,
    pitchbook: isPitchbookConfigured(),
    pitchbookConfigured: isPitchbookConfigured(),
    database: db,
    clerk,
    clerkMode: clerkPk.startsWith('pk_live_') ? 'production' : clerkPk ? 'development' : 'none',
    features: {
      serverPdf: pdfEnabled,
      shareLinks: isShareEnabled(),
      cloudSync: db && clerk,
    },
  })
}
