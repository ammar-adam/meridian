/**
 * Cadence ingestion worker — thin CLI over lib/server/ingest-batch.js
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-ingestion.mjs --cadence=daily --limit=40
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

function parseArgs(argv) {
  const out = { cadence: 'daily', limit: 40, dryRun: false }
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true
    else if (a.startsWith('--cadence=')) out.cadence = a.slice('--cadence='.length)
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice('--limit='.length)) || 40
  }
  return out
}

loadEnv()
const args = parseArgs(process.argv.slice(2))
const { seedSourcesFromBundledFile, runIngestBatch } = await import('@/lib/server/ingest-batch')

const seed = await seedSourcesFromBundledFile()
const result = await runIngestBatch({
  cadence: args.cadence,
  limit: args.limit,
  dryRun: args.dryRun,
})

console.log(JSON.stringify({ ok: true, seed, ...result }, null, 2))
process.exit(result.enabled === false ? 1 : 0)
