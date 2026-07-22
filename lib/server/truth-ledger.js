import { neon } from '@neondatabase/serverless'

/**
 * Truth Ledger — server-side observation record (docs/rebuild-plan.md).
 *
 * The core rule: `first_observed_at` is when MERIDIAN first recorded an
 * entity, never the cohort announcement date. It accrues from the moment
 * this module ships and cannot be backdated — that is what makes the
 * earliness claim falsifiable instead of asserted.
 *
 * All functions are non-fatal: with no DATABASE_URL they return null/empty
 * so the product degrades to cohort-date-only receipts.
 */

let _sql = null
let _ensured = false

function sqlClient() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return null
  if (!_sql) _sql = neon(url)
  return _sql
}

export function isLedgerEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function normalizeEntityId(name) {
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

async function ensureTables(sql) {
  if (_ensured) return
  await sql`CREATE TABLE IF NOT EXISTS ledger_entities (
    id text PRIMARY KEY,
    name text NOT NULL,
    domain text,
    source text,
    program text,
    cohort_date text,
    provenance text,
    first_observed_at timestamptz NOT NULL DEFAULT now(),
    meta jsonb
  )`
  await sql`CREATE TABLE IF NOT EXISTS index_checks (
    id text PRIMARY KEY,
    entity_id text NOT NULL,
    index_name text NOT NULL,
    present boolean,
    detail text,
    checked_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE INDEX IF NOT EXISTS index_checks_entity_idx ON index_checks (entity_id)`
  await sql`CREATE TABLE IF NOT EXISTS flow_outcomes (
    id text PRIMARY KEY,
    actor_id text NOT NULL,
    entity_name text NOT NULL,
    domain text,
    outcome text NOT NULL,
    fund_name text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE INDEX IF NOT EXISTS flow_outcomes_actor_idx ON flow_outcomes (actor_id)`
  await sql`CREATE TABLE IF NOT EXISTS source_watches (
    url text PRIMARY KEY,
    label text NOT NULL,
    content_hash text,
    last_checked_at timestamptz NOT NULL DEFAULT now(),
    last_changed_at timestamptz,
    check_count int NOT NULL DEFAULT 0
  )`
  _ensured = true
}

/**
 * Record observations for a batch of companies and return
 * { [entityId]: { firstObservedAt } }. First insert wins — existing
 * entities keep their original first_observed_at.
 */
export async function recordObservations(companies = []) {
  const sql = sqlClient()
  if (!sql || !companies.length) return {}
  try {
    await ensureTables(sql)
    for (const c of companies) {
      const id = normalizeEntityId(c.name || c.companyName)
      if (!id) continue
      await sql`INSERT INTO ledger_entities (id, name, domain, source, program, cohort_date, provenance)
        VALUES (${id}, ${c.name || c.companyName}, ${c.domain || null}, ${c.source || null},
                ${c.sourceMeta?.program || null}, ${c.cohortDate || c.sourceMeta?.cohortDate || null},
                ${c.provenance || null})
        ON CONFLICT (id) DO NOTHING`
    }
    const ids = companies.map(c => normalizeEntityId(c.name || c.companyName)).filter(Boolean)
    const rows = await sql`SELECT id, first_observed_at FROM ledger_entities WHERE id = ANY(${ids})`
    const map = {}
    for (const r of rows) map[r.id] = { firstObservedAt: r.first_observed_at }
    return map
  } catch (e) {
    console.error('[truth-ledger] recordObservations:', e.message)
    return {}
  }
}

/** Latest index check per (entity, index). Returns { [entityId]: [{indexName, present, detail, checkedAt}] } */
export async function getLatestIndexChecks(entityIds = []) {
  const sql = sqlClient()
  if (!sql || !entityIds.length) return {}
  try {
    await ensureTables(sql)
    const rows = await sql`
      SELECT DISTINCT ON (entity_id, index_name)
        entity_id, index_name, present, detail, checked_at
      FROM index_checks
      WHERE entity_id = ANY(${entityIds})
      ORDER BY entity_id, index_name, checked_at DESC`
    const map = {}
    for (const r of rows) {
      if (!map[r.entity_id]) map[r.entity_id] = []
      map[r.entity_id].push({
        indexName: r.index_name,
        present: r.present,
        detail: r.detail,
        checkedAt: r.checked_at,
      })
    }
    return map
  } catch (e) {
    console.error('[truth-ledger] getLatestIndexChecks:', e.message)
    return {}
  }
}

export async function recordIndexCheck({ entityId, indexName, present, detail }) {
  const sql = sqlClient()
  if (!sql) return false
  try {
    await ensureTables(sql)
    const id = `${entityId}:${indexName}:${Date.now()}`
    await sql`INSERT INTO index_checks (id, entity_id, index_name, present, detail)
      VALUES (${id}, ${entityId}, ${indexName}, ${present}, ${detail || null})`
    return true
  } catch (e) {
    console.error('[truth-ledger] recordIndexCheck:', e.message)
    return false
  }
}

export async function listLedgerEntities(limit = 200) {
  const sql = sqlClient()
  if (!sql) return []
  try {
    await ensureTables(sql)
    return await sql`SELECT id, name, domain, source, program, cohort_date, provenance, first_observed_at
      FROM ledger_entities ORDER BY first_observed_at DESC LIMIT ${limit}`
  } catch (e) {
    console.error('[truth-ledger] listLedgerEntities:', e.message)
    return []
  }
}

export async function recordFlowOutcome({ actorId, entityName, domain, outcome, fundName }) {
  const sql = sqlClient()
  if (!sql || !entityName || !outcome) return false
  try {
    await ensureTables(sql)
    const id = `${normalizeEntityId(entityName)}:${actorId}:${Date.now()}`
    await sql`INSERT INTO flow_outcomes (id, actor_id, entity_name, domain, outcome, fund_name)
      VALUES (${id}, ${actorId}, ${entityName}, ${domain || null}, ${outcome}, ${fundName || null})`
    return true
  } catch (e) {
    console.error('[truth-ledger] recordFlowOutcome:', e.message)
    return false
  }
}

export async function getFlowOutcomes(actorId, limit = 500) {
  const sql = sqlClient()
  if (!sql || !actorId) return []
  try {
    await ensureTables(sql)
    return await sql`SELECT entity_name, domain, outcome, fund_name, created_at
      FROM flow_outcomes WHERE actor_id = ${actorId}
      ORDER BY created_at DESC LIMIT ${limit}`
  } catch (e) {
    console.error('[truth-ledger] getFlowOutcomes:', e.message)
    return []
  }
}

/** Debug: which database/schema this lambda actually reads. */
export async function ledgerIdentity() {
  const sql = sqlClient()
  if (!sql) return null
  try {
    const [row] = await sql`SELECT current_database() AS db, current_schema() AS schema,
      (SELECT count(*)::int FROM ledger_entities) AS n`
    return row
  } catch (e) {
    return { error: e.message }
  }
}

export async function countLedgerEntities() {
  const sql = sqlClient()
  if (!sql) return 0
  try {
    await ensureTables(sql)
    const [row] = await sql`SELECT count(*)::int AS n FROM ledger_entities`
    return row?.n ?? 0
  } catch (e) {
    console.error('[truth-ledger] countLedgerEntities:', e.message)
    return 0
  }
}

/**
 * Record a source-watch check. Returns { changed, previousHash } —
 * changed=true when the stored content hash differs from this one.
 */
export async function upsertSourceCheck({ url, label, hash }) {
  const sql = sqlClient()
  if (!sql || !url) return { changed: false, previousHash: null }
  try {
    await ensureTables(sql)
    const [prev] = await sql`SELECT content_hash FROM source_watches WHERE url = ${url}`
    const previousHash = prev?.content_hash ?? null
    const changed = Boolean(previousHash && hash && previousHash !== hash)
    const changedAt = changed ? new Date().toISOString() : null
    await sql`INSERT INTO source_watches (url, label, content_hash, last_checked_at, last_changed_at, check_count)
      VALUES (${url}, ${label}, ${hash}, now(), ${changedAt}, 1)
      ON CONFLICT (url) DO UPDATE SET
        content_hash = ${hash},
        last_checked_at = now(),
        last_changed_at = CASE WHEN ${changed} THEN now() ELSE source_watches.last_changed_at END,
        check_count = source_watches.check_count + 1`
    return { changed, previousHash }
  } catch (e) {
    console.error('[truth-ledger] upsertSourceCheck:', e.message)
    return { changed: false, previousHash: null }
  }
}

export async function listSourceWatches() {
  const sql = sqlClient()
  if (!sql) return []
  try {
    await ensureTables(sql)
    return await sql`SELECT url, label, last_checked_at, last_changed_at, check_count
      FROM source_watches ORDER BY label`
  } catch (e) {
    console.error('[truth-ledger] listSourceWatches:', e.message)
    return []
  }
}

/** Live, honest benchmark stats from the ledger. */
export async function benchmarkStats() {
  const sql = sqlClient()
  if (!sql) return null
  try {
    await ensureTables(sql)
    const [entities] = await sql`SELECT count(*)::int AS n, min(first_observed_at) AS oldest FROM ledger_entities`
    const checks = await sql`
      SELECT DISTINCT ON (entity_id, index_name) entity_id, index_name, present, checked_at
      FROM index_checks ORDER BY entity_id, index_name, checked_at DESC`
    const checkedEntities = new Set(checks.map(c => c.entity_id))
    const misses = checks.filter(c => c.present === false)
    const missEntityIds = [...new Set(misses.map(c => c.entity_id))]
    let medianMissAgeDays = null
    if (missEntityIds.length) {
      const rows = await sql`SELECT id, first_observed_at FROM ledger_entities WHERE id = ANY(${missEntityIds})`
      const ages = rows
        .map(r => Math.floor((Date.now() - new Date(r.first_observed_at).getTime()) / 86400000))
        .sort((a, b) => a - b)
      medianMissAgeDays = ages.length ? ages[Math.floor(ages.length / 2)] : null
    }
    return {
      entities: entities?.n ?? 0,
      ledgerSince: entities?.oldest ?? null,
      entitiesChecked: checkedEntities.size,
      latestChecks: checks.length,
      verifiedMisses: missEntityIds.length,
      medianMissAgeDays,
      indexes: [...new Set(checks.map(c => c.index_name))],
    }
  } catch (e) {
    console.error('[truth-ledger] benchmarkStats:', e.message)
    return null
  }
}
