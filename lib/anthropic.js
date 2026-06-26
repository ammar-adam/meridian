import { MODELS } from '@/lib/api-models'

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

/**
 * Call Claude with prompt caching on system prompts and optional user-prefix blocks.
 * Caching cuts input cost ~90% on repeated fund context / system instructions.
 */
export async function callAnthropic({
  system,
  messages,
  maxTokens = 4096,
  cacheSystem = true,
  model = MODELS.claude,
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
    throw new Error(err)
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
  }
}
