#!/usr/bin/env node
/**
 * Index-check sweep — dated, falsifiable StartupHub name searches.
 *
 * Writes index_checks rows via the truth ledger. Runs on GitHub Actions
 * (no Vercel cron dependency). Auth not needed — uses DATABASE_URL +
 * STARTUPHUB_API_KEY from the environment.
 *
 * Usage:
 *   node --import ./scripts/alias-register.mjs scripts/ingest/index-check-sweep.mjs [--limit=50] [--delay-ms=400]
 *
 * Exit 0 with a skip message when STARTUPHUB_API_KEY is missing (CI-safe).
 */

function parseArgs(argv) {
  let limit = 50
  let delayMs = 400
  for (const arg of argv) {
    const mLimit = arg.match(/^--limit=(\d+)$/)
    if (mLimit) limit = Math.max(1, Number(mLimit[1]))
    const mDelay = arg.match(/^--delay-ms=(\d+)$/)
    if (mDelay) delayMs = Math.max(0, Number(mDelay[1]))
  }
  return { limit, delayMs }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function hasStartupHubKey() {
  const key = process.env.STARTUPHUB_API_KEY
  return Boolean(key?.trim() && key !== 'your_key_here')
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

async function main() {
  const { limit, delayMs } = parseArgs(process.argv.slice(2))

  // Exit before importing app modules so missing keys never fail CI.
  if (!hasStartupHubKey()) {
    console.log('[index-check-sweep] SKIPPED — STARTUPHUB_API_KEY not configured')
    process.exit(0)
  }
  if (!hasDatabaseUrl()) {
    console.log('[index-check-sweep] SKIPPED — DATABASE_URL not configured')
    process.exit(0)
  }

  const { isStartupHubConfigured, checkStartupHubByName } = await import('../../lib/startuphub.js')
  const {
    isLedgerEnabled,
    listLedgerEntities,
    recordIndexCheck,
    normalizeEntityId,
  } = await import('../../lib/server/truth-ledger.js')

  if (!isStartupHubConfigured()) {
    console.log('[index-check-sweep] SKIPPED — STARTUPHUB_API_KEY not configured')
    process.exit(0)
  }
  if (!isLedgerEnabled()) {
    console.log('[index-check-sweep] SKIPPED — DATABASE_URL not configured')
    process.exit(0)
  }

  let entities = []
  const ledger = await listLedgerEntities(limit)
  if (ledger.length) {
    entities = ledger.map(e => ({
      entityId: e.id || normalizeEntityId(e.name),
      name: e.name,
      domain: e.domain || null,
    }))
  } else {
    try {
      const { listCompanies } = await import('../../lib/server/company-records.js')
      const companies = await listCompanies({ limit })
      entities = companies.map(c => ({
        entityId: normalizeEntityId(c.name),
        name: c.name,
        domain: c.domain || null,
      })).filter(e => e.entityId)
    } catch {
      entities = []
    }
  }

  if (!entities.length) {
    console.log('[index-check-sweep] No entities to check (ledger empty)')
    console.log(JSON.stringify({ checked: 0, presents: 0, misses: 0, errors: 0 }, null, 2))
    process.exit(0)
  }

  console.log(`[index-check-sweep] Checking ${entities.length} entities (limit=${limit}, delay=${delayMs}ms)`)

  let presents = 0
  let misses = 0
  let errors = 0
  const results = []

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    try {
      const { present, detail } = await checkStartupHubByName(entity.name)
      await recordIndexCheck({
        entityId: entity.entityId,
        indexName: 'StartupHub',
        present,
        detail,
      })
      if (present) presents += 1
      else misses += 1
      results.push({ entity: entity.name, present, detail })
      console.log(`  [${i + 1}/${entities.length}] ${entity.name}: ${present ? 'PRESENT' : 'MISS'} — ${detail}`)
    } catch (e) {
      errors += 1
      results.push({ entity: entity.name, error: e.message })
      console.error(`  [${i + 1}/${entities.length}] ${entity.name}: ERROR — ${e.message}`)
    }
    if (i < entities.length - 1 && delayMs > 0) await sleep(delayMs)
  }

  const summary = {
    checked: results.length,
    presents,
    misses,
    errors,
    at: new Date().toISOString(),
  }
  console.log('[index-check-sweep] summary')
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
}

main().catch((e) => {
  console.error('[index-check-sweep] fatal:', e)
  process.exit(1)
})
