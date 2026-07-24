/**
 * Bulk corpus orchestrator — loops StartupHub + registry + Form D + scrape
 * until companyRecords >= target (default 1500).
 *
 * Usage:
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-bulk-corpus.mjs
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-bulk-corpus.mjs --target=1500 --queries=30
 *
 * Requires: DATABASE_URL, STARTUPHUB_API_KEY (StartupHub phase)
 * Optional: ANTHROPIC_API_KEY (scrape phase)
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runStartupHubBulk, STARTUPHUB_BULK_QUERIES } from '@/lib/server/startuphub-bulk'
import { runDomainRegistryAdapter } from '@/lib/sourcing/domain-registry-adapter'
import { runFormDAdapter } from '@/lib/sourcing/form-d-adapter'
import { recordSighting } from '@/lib/server/company-records'
import { recordObservations } from '@/lib/server/truth-ledger'
import { countCompanies } from '@/lib/server/company-records'
import { seedSourcesFromBundledFile, runIngestBatch } from '@/lib/server/ingest-batch'
import { runIndexCheckBatch } from '@/lib/server/index-check-batch'

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

const target = Number(arg('target', '1500'))
const queryBatch = Number(arg('queries', '30'))
const maxHubRounds = Number(arg('maxHubRounds', '30'))
let offset = Number(arg('offset', '0'))
const skipHub = arg('skipHub', '0') === '1'
const skipRegistry = arg('skipRegistry', '0') === '1'
const skipFormd = arg('skipFormd', '0') === '1'
const skipScrape = arg('skipScrape', '0') === '1'

const log = []

async function currentCount() {
  const n = await countCompanies()
  return n ?? 0
}

async function phaseStartupHub() {
  if (skipHub || !process.env.STARTUPHUB_API_KEY?.trim()) {
    log.push({ phase: 'startuphub', skipped: true, reason: 'no STARTUPHUB_API_KEY' })
    return
  }

  for (let round = 0; round < maxHubRounds; round += 1) {
    const before = await currentCount()
    if (before >= target) {
      log.push({ phase: 'startuphub', round, before, status: 'target_met' })
      return
    }

    const result = await runStartupHubBulk({
      offset,
      queryBatch,
      perQueryLimit: 100,
      delayMs: 350,
    })

    const after = await currentCount()
    log.push({ phase: 'startuphub', round, offset, before, after, delta: after - before, ...result })

    if (result.done || result.rateLimited || !result.enabled) return
    offset = result.nextOffset ?? (offset + queryBatch)
    if (after >= target) return
  }
}

const REGISTRY_KEYWORD_SETS = [
  ['ai', 'tech', 'software', 'labs', 'data', 'robotics', 'health', 'fintech'],
  ['pay', 'capital', 'finance', 'bio', 'quantum', 'climate', 'energy', 'security'],
  ['marketplace', 'platform', 'cloud', 'mobile', 'digital', 'smart', 'green', 'med'],
]

async function phaseRegistry() {
  if (skipRegistry) return
  const before = await currentCount()
  if (before >= target) return

  let newSightings = 0
  for (const keywords of REGISTRY_KEYWORD_SETS) {
    try {
      const { entities } = await runDomainRegistryAdapter({
        keywords,
        province: '',
        limit: 350,
        concurrency: 25,
      })
      for (const e of entities || []) {
        const r = await recordSighting({
          name: e.companyName,
          domain: e.domain,
          sourceType: 'registry',
          sourceId: 'domain_registry',
          provenance: e.provenance,
          geography: e.sourceMeta?.geography || 'Canada',
          stage: e.sourceMeta?.stage || 'pre-seed',
          raw: { sourceMeta: e.sourceMeta },
        })
        if (r?.sightingId) newSightings += 1
        if (r?.companyId) {
          await recordObservations([{
            name: e.companyName,
            domain: e.domain,
            source: 'domain_registry',
            provenance: e.provenance,
          }])
        }
      }
    } catch (e) {
      log.push({ phase: 'registry', error: e.message })
    }
  }
  const after = await currentCount()
  log.push({ phase: 'registry', before, after, newSightings, delta: after - before })
}

async function phaseFormD() {
  if (skipFormd) return
  const before = await currentCount()
  if (before >= target) return

  let newSightings = 0
  try {
    const { entities, error } = await runFormDAdapter({ limit: 250, days: 90 })
    for (const e of entities || []) {
      const r = await recordSighting({
        name: e.companyName,
        sourceType: 'capital',
        sourceId: 'form_d',
        provenance: e.provenance || 'SEC Form D · candidate',
        geography: 'US',
        raw: { sourceMeta: e.sourceMeta },
      })
      if (r?.sightingId) newSightings += 1
      if (r?.companyId) {
        await recordObservations([{
          name: e.companyName,
          source: 'form_d',
          provenance: e.provenance,
        }])
      }
    }
    const after = await currentCount()
    log.push({ phase: 'formd', before, after, newSightings, error: error || null, delta: after - before })
  } catch (e) {
    log.push({ phase: 'formd', error: e.message })
  }
}

async function phaseScrape() {
  if (skipScrape || !process.env.ANTHROPIC_API_KEY?.trim()) {
    log.push({ phase: 'scrape', skipped: true, reason: 'no ANTHROPIC_API_KEY' })
    return
  }
  const before = await currentCount()
  if (before >= target) return

  await seedSourcesFromBundledFile()
  const scrape = await runIngestBatch({ cadence: 'daily', limit: 40 })
  const after = await currentCount()
  log.push({ phase: 'scrape', before, after, scrape, delta: after - before })
}

async function phaseIndexCheck() {
  if (!process.env.STARTUPHUB_API_KEY?.trim()) return
  try {
    const indexCheck = await runIndexCheckBatch({ limit: 25, delayMs: 800 })
    log.push({ phase: 'indexCheck', indexCheck })
  } catch (e) {
    log.push({ phase: 'indexCheck', error: e.message })
  }
}

const startCount = await currentCount()
console.log(`[bulk-corpus] target=${target} start=${startCount} totalHubQueries=${STARTUPHUB_BULK_QUERIES.length}`)

if (startCount == null && !process.env.DATABASE_URL?.trim()) {
  console.error('[bulk-corpus] DATABASE_URL missing — hard fail')
  process.exit(2)
}

let hardError = null
try {
  await phaseStartupHub()
  if ((await currentCount()) < target) await phaseRegistry()
  if ((await currentCount()) < target) await phaseFormD()
  if ((await currentCount()) < target) await phaseScrape()
  await phaseIndexCheck()
} catch (e) {
  hardError = e.message || String(e)
  log.push({ phase: 'fatal', error: hardError })
}

const endCount = await currentCount()
const targetMet = endCount != null && endCount >= target
const summary = {
  // Progressive fill: below-target is expected overnight — not a workflow failure.
  ok: !hardError,
  targetMet,
  target,
  startCount,
  endCount,
  delta: endCount != null && startCount != null ? endCount - startCount : null,
  hardError,
  thesis: 'school_ecosystem',
  log,
}

console.log(JSON.stringify(summary, null, 2))
// Exit 0 on successful progressive run (even if below target).
// Exit 2 only on hard infrastructure failure (missing DB / uncaught crash).
process.exit(hardError ? 2 : 0)
