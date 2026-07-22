/**
 * Product Hunt daily launches → company sightings.
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-product-hunt.mjs
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

const { runProductHuntAdapter } = await import('@/lib/sourcing/product-hunt-adapter')
const { recordSighting } = await import('@/lib/server/company-records')

const result = await runProductHuntAdapter({ limit: 25 })
if (result.skipped) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: result.reason }))
  process.exit(0)
}

let newSightings = 0
for (const e of result.entities || []) {
  const provenance = e.domain
    ? e.provenance
    : `${e.provenance} · candidate — domain unknown`
  const row = await recordSighting({
    name: e.companyName,
    domain: e.domain || undefined,
    sourceType: 'launch',
    sourceId: 'product_hunt',
    url: e.sourceMeta?.productHuntUrl || 'https://www.producthunt.com/',
    provenance,
    oneLiner: e.oneLiner || e.sourceMeta?.tagline || null,
    sectors: e.sourceMeta?.topics || null,
    raw: { sourceMeta: e.sourceMeta, confidence: e.confidence },
  })
  if (row?.sightingId) newSightings += 1
}

console.log(JSON.stringify({
  ok: !result.error,
  entityCount: result.entities?.length || 0,
  newSightings,
  error: result.error || null,
  meta: result.meta || null,
}, null, 2))
process.exit(0)
