/**
 * School coverage CLI — Tier-1 scout + emerging discovery.
 *
 * Usage:
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-school-coverage.mjs
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-school-coverage.mjs --limit=8
 *
 * Requires: DATABASE_URL
 * Optional: PERPLEXITY_API_KEY (AI expansion; incubator seeds always run)
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSchoolCoverageSweep } from '@/lib/server/school-scout'
import { runEmergingSchoolDiscovery } from '@/lib/server/emerging-schools'

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

function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : fallback
}

loadEnv()

if (!process.env.DATABASE_URL?.trim()) {
  console.error(JSON.stringify({ ok: false, error: 'DATABASE_URL missing' }))
  process.exit(2)
}

const limit = Number(arg('limit', '8'))
const queriesPerSchool = Number(arg('queries', '1'))

const coverage = await runSchoolCoverageSweep({ limit, queriesPerSchool })
let emerging = null
try {
  emerging = await runEmergingSchoolDiscovery({ limit: 10 })
} catch (e) {
  emerging = { error: e.message }
}

const out = {
  ok: true,
  thesis: 'school_ecosystem',
  coverage: {
    schools: coverage.schools,
    newSightings: coverage.newSightings,
    jobId: coverage.jobId,
  },
  emerging: {
    proposals: emerging?.proposals?.length || 0,
    jobId: emerging?.jobId || null,
    error: emerging?.error || null,
  },
  at: new Date().toISOString(),
}

console.log(JSON.stringify(out, null, 2))
process.exit(0)
