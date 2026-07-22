import { createHash } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

/**
 * Company Records — the durable system of record (docs/build-plan-slices.md Slice A).
 *
 * One record per company; every pipeline (adapters, ingestion, scout, briefs,
 * founder claims) writes SIGHTINGS against it, and every surface reads records.
 * `first_observed_at` carries the truth-ledger rule: set once when Meridian
 * first records the company, never backdated, never reset.
 *
 * All functions are non-fatal: with no DATABASE_URL they return null/empty.
 */

let _sql = null
let _ensured = false

function sqlClient() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return null
  // no-store: Next.js patches global fetch and would otherwise freeze
  // Neon HTTP query responses in its Data Cache.
  if (!_sql) _sql = neon(url, { fetchOptions: { cache: 'no-store' } })
  return _sql
}

export function isRecordsEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

/** Stable company key — prefer domain, else normalized name. */
export function companyKey({ name, domain } = {}) {
  const d = String(domain || '').toLowerCase().trim().replace(/^www\./, '')
  if (d) return d
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function shortHash(input) {
  return createHash('sha1').update(String(input)).digest('hex').slice(0, 16)
}

async function ensureTables(sql) {
  if (_ensured) return
  await sql`CREATE TABLE IF NOT EXISTS companies (
    id text PRIMARY KEY,
    name text NOT NULL,
    domain text,
    one_liner text,
    geography text,
    stage text,
    sectors jsonb,
    meta jsonb,
    first_observed_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE INDEX IF NOT EXISTS companies_domain_idx ON companies (domain)`
  await sql`CREATE TABLE IF NOT EXISTS sightings (
    id text PRIMARY KEY,
    company_id text NOT NULL,
    source_type text NOT NULL,
    source_id text,
    url text,
    cohort_date text,
    provenance text,
    raw jsonb,
    observed_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE INDEX IF NOT EXISTS sightings_company_idx ON sightings (company_id)`
  await sql`CREATE TABLE IF NOT EXISTS people (
    id text PRIMARY KEY,
    name text NOT NULL,
    linkedin_url text,
    email text,
    email_status text NOT NULL DEFAULT 'none',
    meta jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE TABLE IF NOT EXISTS company_people (
    company_id text NOT NULL,
    person_id text NOT NULL,
    role text,
    PRIMARY KEY (company_id, person_id)
  )`
  await sql`CREATE TABLE IF NOT EXISTS funding_events (
    id text PRIMARY KEY,
    company_id text NOT NULL,
    kind text NOT NULL,
    amount text,
    event_date text,
    investors jsonb,
    source_url text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE INDEX IF NOT EXISTS funding_events_company_idx ON funding_events (company_id)`
  await sql`CREATE TABLE IF NOT EXISTS company_research (
    company_id text NOT NULL,
    section text NOT NULL,
    content text,
    confidence text,
    source text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, section)
  )`
  await sql`CREATE TABLE IF NOT EXISTS mandate_watches (
    id text PRIMARY KEY,
    actor_id text NOT NULL,
    fund_id text NOT NULL,
    fund_name text,
    thesis text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_digest_at timestamptz
  )`
  await sql`CREATE INDEX IF NOT EXISTS mandate_watches_actor_idx ON mandate_watches (actor_id)`
  await sql`CREATE TABLE IF NOT EXISTS watch_webhooks (
    id text PRIMARY KEY,
    actor_id text NOT NULL,
    url text NOT NULL,
    events jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE INDEX IF NOT EXISTS watch_webhooks_actor_idx ON watch_webhooks (actor_id)`
  _ensured = true
}

/**
 * Insert or enrich a company. Enrichment fills blanks only — it never
 * overwrites existing values, and never touches first_observed_at.
 */
export async function upsertCompany(c = {}) {
  const sql = sqlClient()
  const id = companyKey(c)
  if (!sql || !id || !c.name) return null
  try {
    await ensureTables(sql)
    await sql`INSERT INTO companies (id, name, domain, one_liner, geography, stage, sectors, meta, first_observed_at)
      VALUES (${id}, ${c.name}, ${c.domain || null}, ${c.oneLiner || null}, ${c.geography || null},
              ${c.stage || null}, ${c.sectors ? JSON.stringify(c.sectors) : null},
              ${c.meta ? JSON.stringify(c.meta) : null},
              ${c.firstObservedAt || new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET
        domain = COALESCE(companies.domain, EXCLUDED.domain),
        one_liner = COALESCE(companies.one_liner, EXCLUDED.one_liner),
        geography = COALESCE(companies.geography, EXCLUDED.geography),
        stage = COALESCE(companies.stage, EXCLUDED.stage),
        sectors = COALESCE(companies.sectors, EXCLUDED.sectors),
        updated_at = now()`
    return id
  } catch (e) {
    console.error('[company-records] upsertCompany:', e.message)
    return null
  }
}

/** Idempotent sighting: same company + source + evidence never duplicates. */
export async function recordSighting(s = {}) {
  const sql = sqlClient()
  if (!sql || !s.name) return null
  try {
    const companyId = await upsertCompany({
      name: s.name,
      domain: s.domain,
      oneLiner: s.oneLiner,
      geography: s.geography,
      stage: s.stage,
      sectors: s.sectors,
      firstObservedAt: s.firstObservedAt,
    })
    if (!companyId) return null
    const sightingId = `${companyId}:${s.sourceType || 'unknown'}:${shortHash(s.url || s.provenance || s.cohortDate || 'seed')}`
    await sql`INSERT INTO sightings (id, company_id, source_type, source_id, url, cohort_date, provenance, raw, observed_at)
      VALUES (${sightingId}, ${companyId}, ${s.sourceType || 'unknown'}, ${s.sourceId || null},
              ${s.url || null}, ${s.cohortDate || null}, ${s.provenance || null},
              ${s.raw ? JSON.stringify(s.raw) : null}, ${s.observedAt || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING`
    return { companyId, sightingId }
  } catch (e) {
    console.error('[company-records] recordSighting:', e.message)
    return null
  }
}

/** Full record: company + sightings + people + funding + cached research. */
export async function getRecord(key) {
  const sql = sqlClient()
  const id = String(key || '').toLowerCase().trim().replace(/^www\./, '')
  if (!sql || !id) return null
  try {
    await ensureTables(sql)
    const [company] = await sql`SELECT * FROM companies WHERE id = ${id} OR domain = ${id} LIMIT 1`
    if (!company) return null
    const [sightings, people, funding, research] = await Promise.all([
      sql`SELECT * FROM sightings WHERE company_id = ${company.id} ORDER BY observed_at ASC`,
      sql`SELECT p.*, cp.role FROM company_people cp JOIN people p ON p.id = cp.person_id WHERE cp.company_id = ${company.id}`,
      sql`SELECT * FROM funding_events WHERE company_id = ${company.id} ORDER BY event_date DESC NULLS LAST`,
      sql`SELECT * FROM company_research WHERE company_id = ${company.id}`,
    ])
    return { company, sightings, people, funding, research }
  } catch (e) {
    console.error('[company-records] getRecord:', e.message)
    return null
  }
}

export async function countCompanies() {
  const sql = sqlClient()
  if (!sql) return null
  try {
    await ensureTables(sql)
    const [row] = await sql`SELECT count(*)::int AS n FROM companies`
    return row?.n ?? 0
  } catch (e) {
    console.error('[company-records] countCompanies:', e.message)
    return null
  }
}

export async function listCompanies({ limit = 200, sourceType = null } = {}) {
  const sql = sqlClient()
  if (!sql) return []
  try {
    await ensureTables(sql)
    if (sourceType) {
      return await sql`SELECT DISTINCT c.* FROM companies c
        JOIN sightings s ON s.company_id = c.id
        WHERE s.source_type = ${sourceType}
        ORDER BY c.first_observed_at DESC LIMIT ${limit}`
    }
    return await sql`SELECT * FROM companies ORDER BY first_observed_at DESC LIMIT ${limit}`
  } catch (e) {
    console.error('[company-records] listCompanies:', e.message)
    return []
  }
}

/** Companies with latest sighting source — powers Flow + scout merge. */
export async function listFlowRecords({ limit = 400 } = {}) {
  const sql = sqlClient()
  if (!sql) return []
  try {
    await ensureTables(sql)
    return await sql`
      SELECT c.*,
        ls.source_type AS latest_source,
        ls.provenance AS latest_provenance
      FROM companies c
      LEFT JOIN LATERAL (
        SELECT source_type, provenance
        FROM sightings
        WHERE company_id = c.id
        ORDER BY observed_at DESC
        LIMIT 1
      ) ls ON true
      ORDER BY c.first_observed_at DESC
      LIMIT ${limit}`
  } catch (e) {
    console.error('[company-records] listFlowRecords:', e.message)
    return []
  }
}

/** Companies first observed after `sinceIso` — real "new since last visit". */
export async function newCompaniesSince(sinceIso, { limit = 100 } = {}) {
  const sql = sqlClient()
  if (!sql || !sinceIso) return []
  try {
    await ensureTables(sql)
    return await sql`SELECT * FROM companies WHERE first_observed_at > ${sinceIso}
      ORDER BY first_observed_at DESC LIMIT ${limit}`
  } catch (e) {
    console.error('[company-records] newCompaniesSince:', e.message)
    return []
  }
}

// ── Research cache: briefs compound instead of restarting ──────────────────

/** Persist research passes for a company; overwrites per section. */
export async function saveResearch(key, passes = [], { source = 'brief' } = {}) {
  const sql = sqlClient()
  const id = String(key || '').toLowerCase().trim().replace(/^www\./, '')
  if (!sql || !id || !passes.length) return false
  try {
    await ensureTables(sql)
    for (const p of passes) {
      if (!p?.section || !p?.content) continue
      await sql`INSERT INTO company_research (company_id, section, content, confidence, source, updated_at)
        VALUES (${id}, ${p.section}, ${p.content}, ${p.confidence || null}, ${source}, now())
        ON CONFLICT (company_id, section) DO UPDATE SET
          content = EXCLUDED.content,
          confidence = EXCLUDED.confidence,
          source = EXCLUDED.source,
          updated_at = now()`
    }
    return true
  } catch (e) {
    console.error('[company-records] saveResearch:', e.message)
    return false
  }
}

/** Research sections fresher than maxAgeDays, or null if none/stale. */
export async function getFreshResearch(key, { maxAgeDays = 30 } = {}) {
  const sql = sqlClient()
  const id = String(key || '').toLowerCase().trim().replace(/^www\./, '')
  if (!sql || !id) return null
  try {
    await ensureTables(sql)
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString()
    const rows = await sql`SELECT section, content, confidence, updated_at FROM company_research
      WHERE company_id = ${id} AND updated_at > ${cutoff}`
    if (!rows.length) return null
    return rows.map(r => ({
      section: r.section,
      content: r.content,
      confidence: r.confidence,
      updatedAt: r.updated_at,
    }))
  } catch (e) {
    console.error('[company-records] getFreshResearch:', e.message)
    return null
  }
}

// ── People ──────────────────────────────────────────────────────────────────

export async function upsertPerson(p = {}) {
  const sql = sqlClient()
  const id = String(p.name || '').toLowerCase().trim().replace(/\s+/g, ' ')
  if (!sql || !id) return null
  try {
    await ensureTables(sql)
    await sql`INSERT INTO people (id, name, linkedin_url, email, email_status, meta)
      VALUES (${id}, ${p.name}, ${p.linkedinUrl || null}, ${p.email || null},
              ${p.emailStatus || 'none'}, ${p.meta ? JSON.stringify(p.meta) : null})
      ON CONFLICT (id) DO UPDATE SET
        linkedin_url = COALESCE(people.linkedin_url, EXCLUDED.linkedin_url),
        email = COALESCE(people.email, EXCLUDED.email),
        email_status = CASE WHEN people.email_status = 'verified' THEN people.email_status ELSE EXCLUDED.email_status END`
    return id
  } catch (e) {
    console.error('[company-records] upsertPerson:', e.message)
    return null
  }
}

export async function linkPersonToCompany(companyId, personId, role = 'founder') {
  const sql = sqlClient()
  if (!sql || !companyId || !personId) return false
  try {
    await sql`INSERT INTO company_people (company_id, person_id, role)
      VALUES (${companyId}, ${personId}, ${role})
      ON CONFLICT (company_id, person_id) DO NOTHING`
    return true
  } catch (e) {
    console.error('[company-records] linkPersonToCompany:', e.message)
    return false
  }
}

// ── Server-side mandate watches ─────────────────────────────────────────────

export async function upsertWatchServer({ actorId, fundId, fundName, thesis } = {}) {
  const sql = sqlClient()
  if (!sql || !actorId || !fundId || !thesis?.trim()) return null
  try {
    await ensureTables(sql)
    const id = `${actorId}:${fundId}`
    await sql`INSERT INTO mandate_watches (id, actor_id, fund_id, fund_name, thesis)
      VALUES (${id}, ${actorId}, ${fundId}, ${fundName || null}, ${thesis.trim()})
      ON CONFLICT (id) DO UPDATE SET
        fund_name = EXCLUDED.fund_name,
        thesis = EXCLUDED.thesis,
        updated_at = now()`
    return id
  } catch (e) {
    console.error('[company-records] upsertWatchServer:', e.message)
    return null
  }
}

export async function listWatchesServer(actorId) {
  const sql = sqlClient()
  if (!sql || !actorId) return []
  try {
    await ensureTables(sql)
    return await sql`SELECT * FROM mandate_watches WHERE actor_id = ${actorId} ORDER BY updated_at DESC`
  } catch (e) {
    console.error('[company-records] listWatchesServer:', e.message)
    return []
  }
}

export async function deleteWatchServer(actorId, fundId) {
  const sql = sqlClient()
  if (!sql || !actorId || !fundId) return false
  try {
    await ensureTables(sql)
    await sql`DELETE FROM mandate_watches WHERE id = ${`${actorId}:${fundId}`}`
    return true
  } catch (e) {
    console.error('[company-records] deleteWatchServer:', e.message)
    return false
  }
}

/** All active watches — the scout agent and digest workers iterate these. */
export async function listAllWatches({ limit = 200 } = {}) {
  const sql = sqlClient()
  if (!sql) return []
  try {
    await ensureTables(sql)
    return await sql`SELECT * FROM mandate_watches ORDER BY updated_at DESC LIMIT ${limit}`
  } catch (e) {
    console.error('[company-records] listAllWatches:', e.message)
    return []
  }
}

// ── Watch webhooks v1 ───────────────────────────────────────────────────────

export async function upsertWebhook({ id, actorId, url, events = [] } = {}) {
  const sql = sqlClient()
  if (!sql || !id || !actorId || !url) return null
  try {
    await ensureTables(sql)
    await sql`INSERT INTO watch_webhooks (id, actor_id, url, events)
      VALUES (${id}, ${actorId}, ${url}, ${JSON.stringify(events)})
      ON CONFLICT (id) DO UPDATE SET
        events = EXCLUDED.events,
        updated_at = now()`
    return id
  } catch (e) {
    console.error('[company-records] upsertWebhook:', e.message)
    return null
  }
}

export async function deleteWebhook(actorId, webhookId) {
  const sql = sqlClient()
  if (!sql || !actorId || !webhookId) return false
  try {
    await ensureTables(sql)
    await sql`DELETE FROM watch_webhooks WHERE id = ${webhookId} AND actor_id = ${actorId}`
    return true
  } catch (e) {
    console.error('[company-records] deleteWebhook:', e.message)
    return false
  }
}

export async function listWebhooksForActor(actorId) {
  const sql = sqlClient()
  if (!sql || !actorId) return []
  try {
    await ensureTables(sql)
    const rows = await sql`SELECT * FROM watch_webhooks WHERE actor_id = ${actorId} ORDER BY updated_at DESC`
    return rows.map(r => ({
      id: r.id,
      actorId: r.actor_id,
      url: r.url,
      events: r.events || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  } catch (e) {
    console.error('[company-records] listWebhooksForActor:', e.message)
    return []
  }
}

export async function listAllWebhooksServer({ limit = 100 } = {}) {
  const sql = sqlClient()
  if (!sql) return []
  try {
    await ensureTables(sql)
    const rows = await sql`SELECT * FROM watch_webhooks ORDER BY updated_at DESC LIMIT ${limit}`
    return rows.map(r => ({
      id: r.id,
      actorId: r.actor_id,
      url: r.url,
      events: r.events || [],
    }))
  } catch (e) {
    console.error('[company-records] listAllWebhooksServer:', e.message)
    return []
  }
}
