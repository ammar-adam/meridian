/**
 * Shared HTTP smoke checks — used by scripts/acceptance-smoke.mjs and deploy CI.
 * Use SMOKE_BASE_URL in vitest (Vite overwrites BASE_URL to "/").
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const DEFAULT_PRODUCTION = 'https://meridian-stg.vercel.app'

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
    // Full config detail requires CRON_SECRET; the public payload is ok+features only.
    const secret = process.env.CRON_SECRET?.trim()
    const res = await fetch(`${base}/api/health`, secret
      ? { headers: { Authorization: `Bearer ${secret}` } }
      : undefined)
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error('health not ok')
    if (!secret) {
      if (!data.features?.aiGeneration || !data.features?.deepResearch) {
        throw new Error('API keys not configured')
      }
      return
    }
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

  await check('deploy freshness (corpus + feedParity)', async () => {
    const corpusRes = await fetch(`${base}/api/corpus`, { cache: 'no-store' })
    const benchRes = await fetch(`${base}/api/benchmark`, { cache: 'no-store' })
    const bench = await benchRes.json()
    if (!benchRes.ok || !bench.enabled) throw new Error('benchmark unavailable')
    const hasFeedParity = Boolean(bench.feedParity?.feedStats)
    const hasBulkFill = 'bulkFill' in bench
    if (corpusRes.status !== 200) {
      throw new Error(
        `/api/corpus HTTP ${corpusRes.status} — prod deploy lagging main. Redeploy Vercel production from latest main.`,
      )
    }
    if (!hasFeedParity || !hasBulkFill) {
      throw new Error(
        'benchmark missing feedParity/bulkFill — prod deploy stale. Vercel → Deployments → Redeploy.',
      )
    }
  })

  await check('adversarial debate (avg >= 7)', async () => {
    const result = spawnSync('node', ['scripts/adversarial-debate.mjs', base], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      throw new Error(result.stdout?.split('\n').slice(-8).join('\n') || 'debate failed')
    }
  })

  const failed = results.filter(r => !r.ok)
  return { results, passed: results.length - failed.length, failed: failed.length, base }
}

export { DEFAULT_PRODUCTION }
