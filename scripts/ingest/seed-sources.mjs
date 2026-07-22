/**
 * Upsert lib/sourcing/source-seeds.json into the sources table.
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/seed-sources.mjs
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

const { upsertSource, isSourceRegistryEnabled } = await import('@/lib/server/source-registry')

if (!isSourceRegistryEnabled()) {
  console.error(JSON.stringify({ ok: false, error: 'DATABASE_URL required' }))
  process.exit(1)
}

const seeds = JSON.parse(readFileSync(resolve(root, 'lib/sourcing/source-seeds.json'), 'utf8'))
let ok = 0
let fail = 0
for (const seed of seeds) {
  const id = await upsertSource(seed)
  if (id) ok += 1
  else fail += 1
}

console.log(JSON.stringify({
  ok: true,
  seeded: ok,
  failed: fail,
  total: seeds.length,
}))
