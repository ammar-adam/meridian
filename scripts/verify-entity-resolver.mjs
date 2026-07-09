/**
 * Evidence script — entity resolver before/after on mixed adapter output.
 * node scripts/verify-entity-resolver.mjs
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

const { runIncubatorAdapter } = await import('../lib/sourcing/incubator-adapter.js')
const { runGrantAdapter } = await import('../lib/sourcing/grant-adapter.js')
const { runEventHostAdapter } = await import('../lib/sourcing/event-host-adapter.js')
const { resolveEntities } = await import('../lib/sourcing/entity-resolver.js')

const incubator = runIncubatorAdapter()
const grants = runGrantAdapter()
const events = runEventHostAdapter()

// Mixed batch: one company-only grant, one person-only event host, one already-linked incubator
const mixed = [
  grants.find(g => g.companyName === 'Adviice Inc.') || grants[0],
  events.find(e => e.personName === 'Hack the North') || events[0],
  incubator.find(i => i.companyName === 'Justmeds') || incubator[0],
  // Force a hard failure case: obscure person unlikely to resolve
  {
    id: 'person_test_obscure',
    type: 'person',
    personName: 'Zxqv Nonexistent Founder 9f3a',
    companyName: null,
    domain: null,
    source: 'event_host',
    confidence: 'medium',
    provenance: 'Synthetic failure case for resolver test',
    sourceMeta: {},
    discoveredAt: new Date().toISOString(),
  },
]

console.log('=== Part 5 — Entity resolver ===')
console.log('BEFORE:')
for (const e of mixed) {
  console.log(`- ${e.type} | person=${e.personName || '—'} | company=${e.companyName || '—'} | source=${e.source}`)
}

const after = await resolveEntities(mixed, { resolveMissing: true, concurrency: 1 })

console.log('\nAFTER:')
for (const e of after) {
  const res = e.sourceMeta?.resolutionResult
  console.log(`- ${e.type} | person=${e.personName || '—'} | company=${e.companyName || '—'} | source=${e.source}`)
  if (e.sourceMeta?.resolutionAttempted) {
    console.log(`  resolution: ${JSON.stringify(res)}`)
  }
}

const success = after.find(e => e.sourceMeta?.resolutionAttempted && (e.personName && e.companyName && e.type === 'linked'))
const failure = after.find(e => e.sourceMeta?.resolutionAttempted && e.type !== 'linked' && !e.sourceMeta?.resolutionResult?.companyName && !e.sourceMeta?.resolutionResult?.founderName)

console.log('\nSuccess example:', success
  ? `${success.personName} ↔ ${success.companyName}`
  : '(none in this batch — check Perplexity key / network)')
console.log('Honest failure example:', failure
  ? `${failure.personName || failure.companyName} remains ${failure.type}`
  : '(none)')
