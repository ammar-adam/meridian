/**
 * Timing / yield evidence for domain registry probe budgets.
 * node --import ./scripts/alias-register.mjs scripts/verify-domain-registry-yield.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i <= 0) continue
  const k = t.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = t.slice(i + 1).trim()
}

const { runDomainRegistryAdapter } = await import('../lib/sourcing/domain-registry-adapter.js')

const keywords = ['pay', 'finance', 'capital', 'tech', 'software', 'data', 'ai', 'digital']
const tiers = [100, 250, 500]

console.log('=== Part 1 — Domain registry yield tiers ===')
console.log('Prior baseline: probed=25, resolved=3, yield≈0.12')
console.log('keywords:', keywords.join(', '))

const rows = []
for (const limit of tiers) {
  const t0 = Date.now()
  const result = await runDomainRegistryAdapter({
    keywords,
    sinceDate: '2023-01-01',
    limit,
    concurrency: 20,
  })
  const wall = Date.now() - t0
  const line = {
    limit,
    ...result.stats,
    wallMs: wall,
    sample: result.entities.slice(0, 3).map(e => ({ name: e.companyName, domain: e.domain })),
  }
  rows.push(line)
  console.log(JSON.stringify({
    limit,
    probed: line.probed,
    resolved: line.resolved,
    yieldRate: line.yieldRate,
    elapsedMs: line.elapsedMs,
    wallMs: wall,
    cacheHits: line.cacheHits,
  }))
}

const bestUnder60s = [...rows].reverse().find(r => r.wallMs < 60_000) || rows[rows.length - 1]
console.log('\nRecommended default (highest under 60s wall):', bestUnder60s.limit)
console.log('Sample entities @ recommended:', JSON.stringify(bestUnder60s.sample, null, 2))

fs.writeFileSync(
  path.join(root, 'scripts/verify-output/domain-registry-yield.json'),
  JSON.stringify({ baseline: { probed: 25, resolved: 3 }, tiers: rows, recommended: bestUnder60s.limit }, null, 2),
)
