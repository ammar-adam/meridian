/**
 * Evidence script — domain registry adapter with real Canadian fintech-ish keywords.
 * node scripts/verify-domain-registry.mjs
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
console.log('=== Part 1 — Domain registry adapter ===')
console.log('keywords:', keywords.join(', '))

const result = await runDomainRegistryAdapter({
  keywords,
  sinceDate: '2023-01-01',
  limit: 25,
})

console.log('stats:', JSON.stringify(result.stats, null, 2))
console.log('entities returned:', result.entities.length)
console.log('sample (up to 3):')
console.log(JSON.stringify(result.entities.slice(0, 3), null, 2))
