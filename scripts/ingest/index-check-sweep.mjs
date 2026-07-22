#!/usr/bin/env node
/**
 * Index-check sweep — thin CLI over lib/server/index-check-batch.js
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/index-check-sweep.mjs [--limit=50]
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

function hasStartupHubKey() {
  const key = process.env.STARTUPHUB_API_KEY
  return Boolean(key?.trim() && key !== 'your_key_here')
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

async function main() {
  const { limit, delayMs } = parseArgs(process.argv.slice(2))

  if (!hasStartupHubKey()) {
    console.log('[index-check-sweep] SKIPPED — STARTUPHUB_API_KEY not configured')
    process.exit(0)
  }
  if (!hasDatabaseUrl()) {
    console.log('[index-check-sweep] SKIPPED — DATABASE_URL not configured')
    process.exit(0)
  }

  const { runIndexCheckBatch } = await import('../../lib/server/index-check-batch.js')
  const summary = await runIndexCheckBatch({ limit, delayMs })
  console.log('[index-check-sweep] summary')
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
}

main().catch((e) => {
  console.error('[index-check-sweep] fatal:', e)
  process.exit(1)
})
