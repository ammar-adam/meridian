import { createHash } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

/**
 * Source registry — cadence-scheduled pages the ingestion worker fetches.
 * (docs/build-plan-slices.md Slice B)
 *
 * All functions are non-fatal: with no DATABASE_URL they return null/empty.
 */

let _sql = null
let _ensured = false

function sqlClient() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return null
  if (!_sql) _sql = neon(url, { fetchOptions: { cache: 'no-store' } })
  return _sql
}

export function isSourceRegistryEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

/** Stable source id from URL (or explicit id). */
export function sourceIdFromUrl(url, explicitId) {
  if (explicitId) return String(explicitId).trim()
  const u = String(url || '').toLowerCase().trim()
  if (!u) return ''
  return createHash('sha1').update(u).digest('hex').slice(0, 16)
}

async function ensureTables(sql) {
  if (_ensured) return
  await sql`CREATE TABLE IF NOT EXISTS sources (
    id text PRIMARY KEY,
    label text,
    url text NOT NULL UNIQUE,
    type text,
    cadence text,
    geography text,
    active boolean DEFAULT true,
    last_run_at timestamptz,
    last_hash text,
    last_error text,
    meta jsonb
  )`
  await sql`CREATE INDEX IF NOT EXISTS sources_active_cadence_idx ON sources (active, cadence)`
  await sql`CREATE TABLE IF NOT EXISTS ingestion_runs (
    id text PRIMARY KEY,
    started_at timestamptz,
    finished_at timestamptz,
    sources_checked int,
    new_companies int,
    new_sightings int,
    errors jsonb,
    summary text
  )`
  _ensured = true
}

/** Active sources, optionally filtered by cadence (daily|weekly). */
export async function listActiveSources({ cadence = null, limit = 500 } = {}) {
  const sql = sqlClient()
  if (!sql) return []
  try {
    await ensureTables(sql)
    if (cadence) {
      return await sql`SELECT * FROM sources WHERE active = true AND cadence = ${cadence}
        ORDER BY last_run_at ASC NULLS FIRST LIMIT ${limit}`
    }
    return await sql`SELECT * FROM sources WHERE active = true
      ORDER BY last_run_at ASC NULLS FIRST LIMIT ${limit}`
  } catch (e) {
    console.error('[source-registry] listActiveSources:', e.message)
    return []
  }
}

/** Insert or update a source by URL. */
export async function upsertSource(s = {}) {
  const sql = sqlClient()
  const url = String(s.url || '').trim()
  if (!sql || !url) return null
  try {
    await ensureTables(sql)
    const id = sourceIdFromUrl(url, s.id)
    await sql`INSERT INTO sources (id, label, url, type, cadence, geography, active, meta)
      VALUES (
        ${id},
        ${s.label || null},
        ${url},
        ${s.type || null},
        ${s.cadence || 'weekly'},
        ${s.geography || null},
        ${s.active !== false},
        ${s.meta ? JSON.stringify(s.meta) : null}
      )
      ON CONFLICT (url) DO UPDATE SET
        label = COALESCE(EXCLUDED.label, sources.label),
        type = COALESCE(EXCLUDED.type, sources.type),
        cadence = COALESCE(EXCLUDED.cadence, sources.cadence),
        geography = COALESCE(EXCLUDED.geography, sources.geography),
        active = EXCLUDED.active,
        meta = COALESCE(EXCLUDED.meta, sources.meta)`
    return id
  } catch (e) {
    console.error('[source-registry] upsertSource:', e.message)
    return null
  }
}

/** Record a fetch attempt: hash on success, error message on failure. */
export async function markSourceRun({ url, hash = null, error = null } = {}) {
  const sql = sqlClient()
  if (!sql || !url) return false
  try {
    await ensureTables(sql)
    if (error) {
      await sql`UPDATE sources SET last_run_at = now(), last_error = ${String(error).slice(0, 500)}
        WHERE url = ${url}`
    } else {
      await sql`UPDATE sources SET last_run_at = now(), last_hash = ${hash}, last_error = null
        WHERE url = ${url}`
    }
    return true
  } catch (e) {
    console.error('[source-registry] markSourceRun:', e.message)
    return false
  }
}

/** Persist an ingestion run summary for audit. */
export async function recordIngestionRun(run = {}) {
  const sql = sqlClient()
  if (!sql) return null
  try {
    await ensureTables(sql)
    const id = run.id || `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    await sql`INSERT INTO ingestion_runs (
      id, started_at, finished_at, sources_checked, new_companies, new_sightings, errors, summary
    ) VALUES (
      ${id},
      ${run.startedAt || new Date().toISOString()},
      ${run.finishedAt || new Date().toISOString()},
      ${run.sourcesChecked ?? 0},
      ${run.newCompanies ?? 0},
      ${run.newSightings ?? 0},
      ${run.errors ? JSON.stringify(run.errors) : null},
      ${run.summary || null}
    )`
    return id
  } catch (e) {
    console.error('[source-registry] recordIngestionRun:', e.message)
    return null
  }
}

/** Pure helper: pick cadence from argv-style string. */
export function normalizeCadence(value) {
  const v = String(value || 'daily').toLowerCase().trim()
  return v === 'weekly' ? 'weekly' : 'daily'
}
