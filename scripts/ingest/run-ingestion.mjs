/**
 * Cadence ingestion worker — fetch sources → hash → Haiku extract → recordSighting.
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-ingestion.mjs --cadence=daily --limit=40
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-ingestion.mjs --cadence=weekly --dry-run
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

const { normalizeCadence, listActiveSources, markSourceRun, recordIngestionRun } = await import('@/lib/server/source-registry')
const { visibleTextHash } = await import('@/lib/server/source-watch')
const { extractEntitiesFromHtml } = await import('@/lib/server/extractor')
const { recordSighting, upsertPerson, linkPersonToCompany } = await import('@/lib/server/company-records')

const cadence = normalizeCadence(args.cadence)
const startedAt = new Date().toISOString()
const errors = []
let sourcesChecked = 0
let sourcesSkippedUnchanged = 0
let sourcesFailed = 0
let newCompanies = 0
let newSightings = 0
let extractedTotal = 0

const LLM_TYPES = new Set(['university', 'incubator', 'accelerator', 'launch'])

const sources = await listActiveSources({ cadence, limit: args.limit })
const toProcess = sources.filter(s => LLM_TYPES.has(s.type) || !s.type)

for (const source of toProcess.slice(0, args.limit)) {
  sourcesChecked += 1
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'MeridianIngest/1.0 (+cohort extraction)' },
      signal: AbortSignal.timeout(25_000),
      redirect: 'follow',
      cache: 'no-store',
    })
    if (!res.ok) {
      sourcesFailed += 1
      const msg = `HTTP ${res.status}`
      errors.push({ url: source.url, error: msg })
      if (!args.dryRun) await markSourceRun({ url: source.url, error: msg })
      continue
    }

    const html = await res.text()
    const hash = visibleTextHash(html)

    if (source.last_hash && source.last_hash === hash) {
      sourcesSkippedUnchanged += 1
      if (!args.dryRun) await markSourceRun({ url: source.url, hash })
      continue
    }

    if (args.dryRun) {
      continue
    }

    const { companies, model, skipped, reason } = await extractEntitiesFromHtml(html, {
      url: source.url,
      sourceLabel: source.label || source.id,
    })

    if (skipped) {
      errors.push({ url: source.url, error: reason || 'extract_skipped' })
    }

    extractedTotal += companies.length

    for (const c of companies) {
      const evidence = c.evidence_quote || 'extracted'
      const provenance = c.domain
        ? `${source.label || source.id} · ${evidence}`
        : `${source.label || source.id} · candidate — domain unknown · ${evidence}`

      const result = await recordSighting({
        name: c.name,
        domain: c.domain || undefined,
        sourceType: source.type || 'incubator',
        sourceId: source.id,
        url: source.url,
        cohortDate: c.cohort_date || null,
        provenance,
        geography: c.geography || source.geography || null,
        stage: c.stage || null,
        sectors: c.sectors || null,
        oneLiner: c.one_liner || null,
        raw: { evidence_quote: c.evidence_quote, program: c.program, model, candidate: c.candidate },
      })

      if (result?.sightingId) newSightings += 1
      if (result?.companyId) newCompanies += 1

      if (result?.companyId && c.founders?.length) {
        for (const founder of c.founders) {
          const personId = await upsertPerson({ name: founder })
          if (personId) await linkPersonToCompany(result.companyId, personId, 'founder')
        }
      }
    }

    await markSourceRun({ url: source.url, hash })
  } catch (e) {
    sourcesFailed += 1
    errors.push({ url: source.url, error: e.message })
    if (!args.dryRun) {
      try { await markSourceRun({ url: source.url, error: e.message }) } catch { /* ignore */ }
    }
  }
}

const finishedAt = new Date().toISOString()
const summary = [
  `cadence=${cadence}`,
  `checked=${sourcesChecked}`,
  `unchanged=${sourcesSkippedUnchanged}`,
  `failed=${sourcesFailed}`,
  `extracted=${extractedTotal}`,
  `sightings=${newSightings}`,
  args.dryRun ? 'dry-run' : null,
].filter(Boolean).join(' · ')

if (!args.dryRun) {
  await recordIngestionRun({
    startedAt,
    finishedAt,
    sourcesChecked,
    newCompanies,
    newSightings,
    errors: errors.slice(0, 50),
    summary,
  })
}

console.log(JSON.stringify({
  ok: true,
  cadence,
  dryRun: args.dryRun,
  sourcesAvailable: sources.length,
  sourcesChecked,
  sourcesSkippedUnchanged,
  sourcesFailed,
  extractedTotal,
  newCompanies,
  newSightings,
  errors: errors.slice(0, 20),
  summary,
  startedAt,
  finishedAt,
}, null, 2))
process.exit(0)
