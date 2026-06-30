/**
 * Shared HTTP smoke checks — used by scripts/acceptance-smoke.mjs and deploy CI.
 * Use SMOKE_BASE_URL in vitest (Vite overwrites BASE_URL to "/").
 */
const DEFAULT_PRODUCTION = 'https://meridian-eight-sandy.vercel.app'

export function resolveSmokeBaseUrl(override) {
  const raw = (
    override
    || process.env.SMOKE_BASE_URL
    || process.env.MERIDIAN_PRODUCTION_URL
    || process.env.BASE_URL
    || 'http://localhost:3000'
  ).trim().replace(/\/$/, '')

  if (!raw || raw === '/' || !/^https?:\/\//i.test(raw)) {
    throw new Error(`Invalid smoke base URL: "${raw}" — set SMOKE_BASE_URL`)
  }
  return raw
}

export async function runSmokeChecks(baseUrl) {
  const base = resolveSmokeBaseUrl(baseUrl)
  const results = []

  async function check(name, fn) {
    try {
      await fn()
      results.push({ name, ok: true })
    } catch (err) {
      results.push({ name, ok: false, error: err.message })
    }
  }

  await check('health', async () => {
    const res = await fetch(`${base}/api/health`)
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error('health not ok')
    if (!data.anthropic || !data.perplexity) throw new Error('API keys not configured')
    if (data.anthropicPing && !data.anthropicPing.ok) {
      throw new Error(data.anthropicPing.error || 'anthropic fast ping failed')
    }
    if (data.anthropicSonnetPing && !data.anthropicSonnetPing.ok) {
      throw new Error(data.anthropicSonnetPing.error || 'anthropic sonnet ping failed')
    }
  })

  await check('scrape latency', async () => {
    const start = Date.now()
    const res = await fetch(`${base}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://stripe.com' }),
    })
    const ms = Date.now() - start
    if (!res.ok) throw new Error(`status ${res.status}`)
    if (ms > 8000) throw new Error(`too slow (${ms}ms)`)
  })

  await check('batch endpoint', async () => {
    const res = await fetch(`${base}/api/batch`, {
      cache: 'no-store',
      headers: { Cookie: 'meridian_did=smoke-test-device-001' },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `status ${res.status}`)
    if (!('job' in data)) throw new Error('missing job field in batch response')
  })

  const failed = results.filter(r => !r.ok)
  return { results, passed: results.length - failed.length, failed: failed.length, base }
}

export { DEFAULT_PRODUCTION }
