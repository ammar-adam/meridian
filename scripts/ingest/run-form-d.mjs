/**
 * SEC Form D filings → company sightings (+ funding event hints).
 *
 *   node --import ./scripts/alias-register.mjs scripts/ingest/run-form-d.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

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

const { runFormDAdapter } = await import('@/lib/sourcing/form-d-adapter')
const { recordSighting, companyKey } = await import('@/lib/server/company-records')

const result = await runFormDAdapter({ limit: 200, days: 90 })

let newSightings = 0
for (const e of result.entities || []) {
  const row = await recordSighting({
    name: e.companyName,
    domain: undefined,
    sourceType: 'capital',
    sourceId: 'form_d',
    url: e.sourceMeta?.filingUrl || null,
    provenance: e.provenance || 'SEC Form D · candidate — domain unknown',
    geography: 'US',
    stage: null,
    raw: { sourceMeta: e.sourceMeta, kind: 'form_d' },
  })
  if (row?.sightingId) newSightings += 1
}

let fundingWritten = 0
const dbUrl = process.env.DATABASE_URL?.trim()
if (dbUrl && result.fundingHints?.length) {
  try {
    const sql = neon(dbUrl, { fetchOptions: { cache: 'no-store' } })
    for (const hint of result.fundingHints) {
      const cid = companyKey({ name: hint.name })
      if (!cid) continue
      const id = `formd_${createHash('sha1').update(`${cid}:${hint.eventDate || ''}:${hint.sourceUrl || ''}`).digest('hex').slice(0, 16)}`
      await sql`INSERT INTO funding_events (id, company_id, kind, amount, event_date, investors, source_url)
        VALUES (${id}, ${cid}, ${'form_d'}, ${hint.amount || null}, ${hint.eventDate || null},
                ${null}, ${hint.sourceUrl || null})
        ON CONFLICT (id) DO NOTHING`
      fundingWritten += 1
    }
  } catch (e) {
    console.warn('[run-form-d] funding_events write skipped:', e.message)
  }
}

console.log(JSON.stringify({
  ok: !result.error,
  entityCount: result.entities?.length || 0,
  newSightings,
  fundingWritten,
  error: result.error || null,
  meta: result.meta || null,
}, null, 2))
process.exit(0)
