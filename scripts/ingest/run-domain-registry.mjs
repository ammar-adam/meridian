/**
 * Scheduled domain-registry sweep — records sightings (not request-time).
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-domain-registry.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const envPath = resolve(root, name)
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  }
}

loadEnv()

const { runDomainRegistryAdapter } = await import('@/lib/sourcing/domain-registry-adapter')
const { recordSighting } = await import('@/lib/server/company-records')
const { recordIngestionRun } = await import('@/lib/server/source-registry')

const keywords = ['fintech', 'pay', 'software', 'ai', 'data', 'tech', 'capital', 'finance', 'health', 'climate']
const startedAt = new Date().toISOString()

let entities = []
let stats = null
let error = null
try {
  const result = await runDomainRegistryAdapter({
    keywords,
    province: '',
    limit: 120,
    concurrency: 20,
  })
  entities = result.entities || []
  stats = result.stats
} catch (e) {
  error = e.message
}

let newSightings = 0
for (const e of entities) {
  const result = await recordSighting({
    name: e.companyName,
    domain: e.domain || undefined,
    sourceType: 'registry',
    sourceId: 'domain_registry',
    url: e.domain ? `https://${e.domain}` : null,
    provenance: e.provenance || 'Domain registry · incorporation + live DNS',
    geography: e.sourceMeta?.geography || 'Canada',
    stage: e.sourceMeta?.stage || 'pre-seed',
    oneLiner: null,
    raw: { sourceMeta: e.sourceMeta, confidence: e.confidence },
  })
  if (result?.sightingId) newSightings += 1
}

const finishedAt = new Date().toISOString()
const summary = `domain-registry · entities=${entities.length} · sightings=${newSightings}${error ? ` · error=${error}` : ''}`

await recordIngestionRun({
  startedAt,
  finishedAt,
  sourcesChecked: 1,
  newCompanies: newSightings,
  newSightings,
  errors: error ? [{ error }] : null,
  summary,
})

console.log(JSON.stringify({
  ok: !error,
  entityCount: entities.length,
  newSightings,
  stats,
  error,
  summary,
}, null, 2))

process.exit(0)
