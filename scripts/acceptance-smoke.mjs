/**
 * Run: npm run smoke
 * Optional: BASE_URL=https://meridian-eight-sandy.vercel.app npm run smoke
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function check(name, fn) {
  try {
    await fn()
    console.log(`✓ ${name}`)
    return true
  } catch (err) {
    console.error(`✗ ${name}:`, err.message)
    return false
  }
}

let passed = 0
let failed = 0

async function run() {
  console.log(`Smoke tests → ${BASE}\n`)

  if (await check('health', async () => {
    const res = await fetch(`${BASE}/api/health`)
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error('health not ok')
    if (!data.anthropic || !data.perplexity) throw new Error('API keys not configured')
    if (data.anthropicPing && !data.anthropicPing.ok) {
      throw new Error(data.anthropicPing.error || 'anthropic ping failed')
    }
  })) passed++; else failed++

  if (await check('scrape latency', async () => {
    const start = Date.now()
    const res = await fetch(`${BASE}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://stripe.com' }),
    })
    const ms = Date.now() - start
    if (!res.ok) throw new Error(`status ${res.status}`)
    if (ms > 8000) throw new Error(`too slow (${ms}ms)`)
  })) passed++; else failed++

  if (await check('batch endpoint', async () => {
    const res = await fetch(`${BASE}/api/batch`, {
      cache: 'no-store',
      headers: { Cookie: 'meridian_did=smoke-test-device-001' },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `status ${res.status}`)
    if (!('job' in data)) throw new Error('missing job field in batch response')
  })) passed++; else failed++

  console.log(`\n${passed} passed, ${failed} failed`)
  console.log('\nManual checks:')
  console.log('  1. /brief → paste URL → preview <3s → draft <5s → full brief <75s')
  console.log('  2. /lists → batch 3 URLs → refresh mid-run → auto-resume')
  console.log('  3. Share link → incognito Pursue → Library shows GP outcome')

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
