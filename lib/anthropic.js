import { MODELS, anthropicModelFallbacks } from '@/lib/api-models'

/** Anthropic content block with optional prompt cache */
export function textBlock(text, { cache = false } = {}) {
  if (!text) return null
  const block = { type: 'text', text }
  if (cache) block.cache_control = { type: 'ephemeral' }
  return block
}

/** User/assistant message with string or block array content */
export function buildMessage(role, content, { cachePrefix = false } = {}) {
  if (typeof content === 'string') {
    return { role, content }
  }
  const blocks = content.filter(Boolean)
  if (cachePrefix && blocks.length > 1 && blocks[0]) {
    blocks[0].cache_control = { type: 'ephemeral' }
  }
  return { role, content: blocks }
}

/** Map Anthropic API error bodies to client-safe messages. */
export function parseAnthropicError(raw) {
  if (!raw) return 'AI request failed — try again'
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    const err = data?.error ?? data
    const type = err?.type || ''
    const msg = err?.message || ''

    if (type === 'not_found_error' || /model.*deprecated|model.*not_found/i.test(msg)) {
      return 'AI model unavailable — retry in a moment or contact support'
    }
    if (type === 'rate_limit_error' || /rate.?limit/i.test(msg)) {
      return 'Rate limited — wait 30 seconds and retry'
    }
    if (type === 'authentication_error' || /authentication|api.?key/i.test(msg)) {
      return 'API key invalid — check server configuration'
    }
    if (type === 'overloaded_error' || /overloaded/i.test(msg)) {
      return 'AI service busy — retry shortly'
    }
    if (msg) return msg.slice(0, 200)
  } catch {
    if (typeof raw === 'string' && raw.length < 200) return raw
  }
  return 'AI request failed — try again'
}

function isModelUnavailableError(message) {
  return /model unavailable|model.*deprecated|not_found|model.*not_found/i.test(message || '')
}

async function callAnthropicOnce({
  system,
  messages,
  maxTokens,
  cacheSystem,
  model,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  let systemPayload = system
  if (system && cacheSystem) {
    systemPayload = [textBlock(system, { cache: true })]
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPayload,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(parseAnthropicError(err))
  }

  const data = await res.json()
  const usage = data.usage ?? {}

  if (usage.cache_read_input_tokens || usage.cache_creation_input_tokens) {
    console.log(
      '[anthropic]',
      model,
      'cache read:', usage.cache_read_input_tokens ?? 0,
      'cache write:', usage.cache_creation_input_tokens ?? 0,
      'input:', usage.input_tokens ?? 0,
    )
  }

  return {
    text: data.content?.[0]?.text ?? '',
    usage,
    model,
  }
}

/**
 * Call Claude with prompt caching on system prompts and optional user-prefix blocks.
 * Caching cuts input cost ~90% on repeated fund context / system instructions.
 * Retries with fallback models when the primary model is unavailable.
 */
export async function callAnthropic({
  system,
  messages,
  maxTokens = 4096,
  cacheSystem = true,
  model = MODELS.claude,
}) {
  const models = anthropicModelFallbacks(model)
  let lastError

  for (const candidate of models) {
    try {
      return await callAnthropicOnce({ system, messages, maxTokens, cacheSystem, model: candidate })
    } catch (err) {
      lastError = err
      if (!isModelUnavailableError(err.message)) throw err
      if (candidate !== models[models.length - 1]) {
        console.warn(`[anthropic] ${candidate} unavailable, trying fallback`)
      }
    }
  }

  throw lastError || new Error('AI request failed — try again')
}
