/**
 * Emerging-school discovery — surface rising ecosystems before GPs keyword them.
 * Good-enough v1: score university sources not yet linked to Tier-1, propose schools.
 */

import sourceSeeds from '@/lib/sourcing/source-seeds.json'
import { TIER1_SCHOOLS, sourcesForSchool } from '@/lib/schools/registry'
import { startJob, finishJob } from '@/lib/server/agent-jobs'
import { neon } from '@neondatabase/serverless'

const PROPOSALS_TABLE = true

let _sql = null
let _ensured = false

function sqlClient() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return null
  if (!_sql) _sql = neon(url, { fetchOptions: { cache: 'no-store' } })
  return _sql
}

async function ensure(sql) {
  if (_ensured) return
  await sql`CREATE TABLE IF NOT EXISTS emerging_school_proposals (
    id text PRIMARY KEY,
    name text NOT NULL,
    country text,
    heat int NOT NULL DEFAULT 0,
    evidence jsonb,
    status text NOT NULL DEFAULT 'proposed',
    created_at timestamptz NOT NULL DEFAULT now()
  )`
  _ensured = true
}

function inferCountry(geo = '', url = '') {
  const g = `${geo} ${url}`.toLowerCase()
  if (/canada|toronto|waterloo|montreal|vancouver|ottawa|ontario|quebec|alberta|bc\b/.test(g)) return 'CA'
  if (/uk|united kingdom|london|oxford|cambridge|england|scotland|\.uk\b/.test(g)) return 'UK'
  if (/usa|united states|\.edu\b|california|boston|pittsburgh|new york/.test(g)) return 'US'
  return 'US'
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function coveredByTier1(label, url) {
  const hay = `${label} ${url}`.toLowerCase()
  return TIER1_SCHOOLS.some(s => {
    const tokens = [s.name, ...(s.aliases || [])].map(t => t.toLowerCase())
    return tokens.some(t => t.length > 2 && hay.includes(t))
  })
}

/**
 * Propose emerging schools from university source seeds not owned by Tier-1.
 */
export async function runEmergingSchoolDiscovery({ limit = 12 } = {}) {
  const job = await startJob({ type: 'emerging_school', trigger: 'source-seeds' })

  const uni = (sourceSeeds || []).filter(s => s.type === 'university')
  const buckets = new Map()

  for (const src of uni) {
    if (coveredByTier1(src.label, src.url)) continue
    // Group by first meaningful token in label (e.g. "Western", "Concordia")
    const label = String(src.label || '').replace(/\s+[—\-].*$/, '').trim()
    const key = slugify(label.split(/\s+/).slice(0, 3).join(' ')) || src.id
    if (!buckets.has(key)) {
      buckets.set(key, {
        id: `emerging_${key}`,
        name: label || src.id,
        country: inferCountry(src.geography, src.url),
        heat: 0,
        sources: [],
      })
    }
    const b = buckets.get(key)
    b.heat += 1
    b.sources.push({ id: src.id, label: src.label, url: src.url })
  }

  // Boost schools that already have zero Tier-1 source coverage nearby
  const proposals = [...buckets.values()]
    .map(p => ({
      ...p,
      heat: p.heat + (sourcesForSchool(p).length ? 0 : 1),
      tier: 'emerging',
    }))
    .sort((a, b) => b.heat - a.heat)
    .slice(0, limit)

  const sql = sqlClient()
  if (sql && PROPOSALS_TABLE) {
    try {
      await ensure(sql)
      for (const p of proposals) {
        // eslint-disable-next-line no-await-in-loop
        await sql`INSERT INTO emerging_school_proposals (id, name, country, heat, evidence, status)
          VALUES (${p.id}, ${p.name}, ${p.country}, ${p.heat},
                  ${JSON.stringify({ sources: p.sources })}, 'proposed')
          ON CONFLICT (id) DO UPDATE SET heat = EXCLUDED.heat, evidence = EXCLUDED.evidence`
      }
    } catch (e) {
      console.error('[emerging-schools]', e.message)
    }
  }

  await finishJob(job.id, {
    status: 'done',
    summary: `Emerging discovery · ${proposals.length} proposals from ${uni.length} university sources`,
    meta: { proposals: proposals.length, universitySources: uni.length },
  })

  return {
    ok: true,
    universitySources: uni.length,
    proposals,
    jobId: job.id,
    note: 'Proposed only — promote into registry after review. Heat = linked source pages not already owned by Tier-1.',
  }
}

export async function listEmergingProposals({ limit = 20 } = {}) {
  const sql = sqlClient()
  if (sql) {
    try {
      await ensure(sql)
      const rows = await sql`SELECT * FROM emerging_school_proposals
        ORDER BY heat DESC, created_at DESC LIMIT ${limit}`
      if (rows?.length) {
        return rows.map(r => ({
          id: r.id,
          name: r.name,
          country: r.country,
          heat: r.heat,
          evidence: r.evidence,
          status: r.status,
          createdAt: r.created_at,
        }))
      }
    } catch { /* fall through */ }
  }
  const fresh = await runEmergingSchoolDiscovery({ limit })
  return fresh.proposals
}
