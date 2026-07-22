/**
 * Scout agent — v1 Perplexity engine as a candidate feed for active watches.
 * NEVER marks results verified or community_first.
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/scout-sweep.mjs
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

const { runScoutSweep } = await import('@/lib/server/scout-sweep')
const result = await runScoutSweep()
console.log(JSON.stringify(result, null, 2))
process.exit(result.skipped ? 0 : result.ok ? 0 : 1)
