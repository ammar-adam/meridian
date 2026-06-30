/**
 * Run: npm run smoke
 * Optional: BASE_URL=https://meridian-eight-sandy.vercel.app npm run smoke
 */
import { runSmokeChecks, resolveSmokeBaseUrl, DEFAULT_PRODUCTION } from '../tests/lib/smoke-checks.mjs'

const BASE = resolveSmokeBaseUrl(
  process.env.SMOKE_BASE_URL || process.env.MERIDIAN_PRODUCTION_URL || process.env.BASE_URL || DEFAULT_PRODUCTION
)

async function run() {
  console.log(`Smoke tests → ${BASE}\n`)
  const { results, passed, failed } = await runSmokeChecks(BASE)

  for (const r of results) {
    if (r.ok) console.log(`✓ ${r.name}`)
    else console.error(`✗ ${r.name}:`, r.error)
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log('\nManual checks:')
    console.log('  1. /brief → paste URL → preview <3s → draft <5s → full brief <75s')
    console.log('  2. /lists → batch 3 URLs → refresh mid-run → auto-resume')
    console.log('  3. Share link → incognito Pursue → Library shows GP outcome')
  }

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
