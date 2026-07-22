/**
 * StartupHub bulk corpus fill — operator script.
 * Usage: node --import ./scripts/alias-register.mjs scripts/ingest/startuphub-bulk.mjs [--offset=0] [--queries=25]
 *
 * Requires DATABASE_URL and STARTUPHUB_API_KEY.
 */
import { runStartupHubBulk, STARTUPHUB_BULK_QUERIES } from '@/lib/server/startuphub-bulk'
import { countCompanies } from '@/lib/server/company-records'

function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : fallback
}

const offset = Number(arg('offset', '0'))
const queryBatch = Number(arg('queries', '25'))
const perQueryLimit = Number(arg('perQueryLimit', '100'))

const before = await countCompanies()
console.log(`[startuphub-bulk] companyRecords before: ${before ?? '—'}`)

const result = await runStartupHubBulk({
  offset,
  queryBatch,
  perQueryLimit,
  delayMs: 350,
})

console.log(JSON.stringify(result, null, 2))

const after = await countCompanies()
console.log(`[startuphub-bulk] companyRecords after: ${after ?? '—'} (Δ ${(after ?? 0) - (before ?? 0)})`)

if (result.nextOffset != null && !result.done) {
  console.log(`\nNext: node --import ./scripts/alias-register.mjs scripts/ingest/startuphub-bulk.mjs --offset=${result.nextOffset} --queries=${queryBatch}`)
  console.log(`Progress: ${result.nextOffset}/${STARTUPHUB_BULK_QUERIES.length} queries`)
}
