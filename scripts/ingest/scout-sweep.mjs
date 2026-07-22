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

if (!process.env.PERPLEXITY_API_KEY?.trim() || process.env.PERPLEXITY_API_KEY === 'your_key_here') {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: 'PERPLEXITY_API_KEY missing' }))
  process.exit(0)
}

const { listAllWatches, recordSighting } = await import('@/lib/server/company-records')
const { runPerplexityQuery } = await import('@/lib/discover-research')
const { recordIngestionRun } = await import('@/lib/server/source-registry')
const { parseScoutCandidates } = await import('@/lib/sourcing/scout-parse')

const startedAt = new Date().toISOString()
const watches = await listAllWatches({ limit: 50 })
const errors = []
let queriesRun = 0
let newSightings = 0
let candidatesFound = 0

for (const watch of watches) {
  const thesis = String(watch.thesis || '').trim()
  if (!thesis) continue
  const fundName = watch.fund_name || watch.fund_id || 'mandate'

  const queries = [
    `Startups announced or launched in the last 14 days matching: ${thesis}. Return company names, domains if known, and one-line why.`,
    `Early-stage companies raised or came out of stealth in the last 14 days matching: ${thesis}. List name, website domain if known, one-line description.`,
  ]

  for (const query of queries.slice(0, 2)) {
    try {
      queriesRun += 1
      const text = await runPerplexityQuery(query)
      const candidates = parseScoutCandidates(text)
      candidatesFound += candidates.length

      for (const c of candidates) {
        const provenance = `Scout · mandate "${fundName}" · AI-researched, unverified${c.domain ? '' : ' · candidate — domain unknown'}`
        const row = await recordSighting({
          name: c.name,
          domain: c.domain || undefined,
          sourceType: 'scout',
          sourceId: watch.id || 'scout',
          url: null,
          provenance,
          oneLiner: c.why || null,
          raw: {
            heuristic: true,
            watchId: watch.id,
            fundId: watch.fund_id,
            query,
            labels: { verified: false, community_first: false, ai_researched: true },
          },
        })
        if (row?.sightingId) newSightings += 1
      }
    } catch (e) {
      errors.push({ watchId: watch.id, error: e.message })
    }
  }
}

const finishedAt = new Date().toISOString()
const summary = `scout · watches=${watches.length} · queries=${queriesRun} · candidates=${candidatesFound} · sightings=${newSightings}`

await recordIngestionRun({
  startedAt,
  finishedAt,
  sourcesChecked: watches.length,
  newCompanies: newSightings,
  newSightings,
  errors: errors.slice(0, 30),
  summary,
})

console.log(JSON.stringify({
  ok: true,
  watches: watches.length,
  queriesRun,
  candidatesFound,
  newSightings,
  errors: errors.slice(0, 10),
  summary,
}, null, 2))
process.exit(0)
