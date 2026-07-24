/**
 * School-scoped scout — find startups tied to a university ecosystem.
 * Writes sightings with provenance; never marks verified/community_first.
 *
 * Order: (1) curated incubator seeds matching the school, (2) Perplexity,
 * (3) always register birthing-source URLs so coverage never looks empty.
 */

import { recordSighting } from '@/lib/server/company-records'
import { runPerplexityQuery } from '@/lib/discover-research'
import { parseScoutCandidates } from '@/lib/sourcing/scout-parse'
import { listSchoolsServer, sourcesForSchool } from '@/lib/schools/registry'
import { startJob, finishJob } from '@/lib/server/agent-jobs'
import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'

function scoutEnabled() {
  const key = process.env.PERPLEXITY_API_KEY?.trim()
  return Boolean(key && key !== 'your_key_here')
}

function schoolFromId(schoolId) {
  return listSchoolsServer().find(s => s.id === schoolId) || null
}

function schoolTokens(school) {
  return [school.name, ...(school.aliases || [])].map(t => String(t).toLowerCase())
}

function geographyFor(school) {
  if (school.country === 'CA') return 'Canada'
  if (school.country === 'UK') return 'United Kingdom'
  return 'United States'
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Short aliases (Cal, MIT, CMU) need boundaries so Cal ≠ Calgary. */
export function hayMatchesSchoolToken(hay, token) {
  const t = String(token || '').toLowerCase()
  if (t.length <= 2) return false
  if (t.length <= 4) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(t)}(?:[^a-z0-9]|$)`, 'i').test(hay)
  }
  return hay.includes(t)
}

/** Block Cambridge UK ← Cambridge ON, Berkeley ← Calgary Velocity, etc. */
export function geographyCompatibleWithSchool(school, geography) {
  const g = String(geography || '').toLowerCase()
  if (!g) return true
  if (school.country === 'UK') {
    if (g.includes('canada') || g.includes('united states') || /\busa\b/.test(g)) return false
  }
  if (school.country === 'CA') {
    if (g.includes('united kingdom') || g.includes('united states') || /\busa\b/.test(g)) return false
  }
  if (school.country === 'US') {
    if (g.includes('canada') || g.includes('united kingdom') || /\buk\b/.test(g)) return false
  }
  return true
}

/** Curated incubator/cohort rows that clearly belong to this school. */
export function localEcosystemCompanies(school) {
  const tokens = schoolTokens(school)
  try {
    return runIncubatorAdapter()
      .filter(e => {
        const meta = e.sourceMeta || {}
        if (!geographyCompatibleWithSchool(school, meta.geography)) return false
        const hay = `${e.companyName || ''} ${meta.geography || ''} ${e.provenance || ''} ${meta.cohortName || ''}`.toLowerCase()
        return tokens.some(t => hayMatchesSchoolToken(hay, t))
      })
      .slice(0, 15)
  } catch {
    return []
  }
}

/** Looser parse when Sonar returns prose without clean bullets. */
function parseLooseCandidates(text) {
  const strict = parseScoutCandidates(text)
  if (strict.length) return strict
  const out = []
  const seen = new Set()
  for (const line of String(text || '').split(/\n+/)) {
    const m = line.match(/\*\*([^*]{2,60})\*\*|\|\s*([A-Z][^|]{1,50})\s*\||^[-*]\s*([A-Z][A-Za-z0-9 .&'-]{1,50})/)
    const name = (m?.[1] || m?.[2] || m?.[3] || '').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    if (/^(the|and|for|with|from|early|startup)/i.test(name)) continue
    seen.add(name.toLowerCase())
    const domain = line.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i)?.[1]?.toLowerCase()
    out.push({ name: name.slice(0, 80), domain: domain || null, why: line.slice(0, 160), heuristic: true })
    if (out.length >= 12) break
  }
  return out
}

async function writeCandidate(school, c, sourceType, sourceId, url, extra = {}) {
  const provenance = `School scout · ${school.name} · ${new Date().toISOString().slice(0, 10)}${extra.provenanceSuffix || ''}`
  return recordSighting({
    name: c.name,
    domain: c.domain || undefined,
    sourceType,
    sourceId,
    url: url || null,
    provenance,
    oneLiner: c.why || c.description || null,
    geography: c.geography || geographyFor(school),
    stage: c.stage || null,
    raw: {
      schoolId: school.id,
      schoolName: school.name,
      country: school.country,
      tier: school.tier,
      verified: false,
      community_first: false,
      ...extra.raw,
    },
  })
}

/**
 * Scout one school.
 */
export async function runSchoolScout(schoolId, { queries = 1 } = {}) {
  const school = schoolFromId(schoolId)
  if (!school) {
    return { ok: false, error: 'School not found', schoolId }
  }

  const job = await startJob({
    type: 'school_scout',
    trigger: school.id,
    meta: { schoolName: school.name, country: school.country },
  })

  const sources = sourcesForSchool(school)
  const errors = []
  let newSightings = 0
  let candidatesFound = 0
  let fromLocal = 0
  let fromPerplexity = 0

  // 1) Curated local ecosystem (makes Waterloo/UofT demos reliable)
  for (const e of localEcosystemCompanies(school)) {
    const row = await writeCandidate(
      school,
      {
        name: e.companyName,
        domain: e.domain,
        why: e.sourceMeta?.description || e.description,
        geography: e.sourceMeta?.geography || geographyFor(school),
        stage: e.sourceMeta?.stage || 'pre-seed',
      },
      'university_scout',
      school.id,
      sources[0]?.url || null,
      {
        provenanceSuffix: ` · ${e.provenance || e.sourceMeta?.cohortName || 'cohort'}`,
        raw: {
          fromIncubatorSeed: true,
          personName: e.personName || null,
        },
      },
    )
    candidatesFound += 1
    if (row?.sightingId) {
      newSightings += 1
      fromLocal += 1
    }
  }

  // 2) Perplexity expansion
  if (scoutEnabled()) {
    const q = [
      `List 8 early-stage startups from ${school.name} (students, alumni, or campus incubators like Velocity/DMZ/CDL). Format each line exactly as: Name | domain.com | one-line description with year or source if known. Prefer pre-seed and seed. Only claim what you can date or source.`,
    ]
    for (const query of q.slice(0, queries)) {
      try {
        const text = await runPerplexityQuery(query)
        const candidates = parseLooseCandidates(text)
        for (const c of candidates) {
          candidatesFound += 1
          const row = await writeCandidate(
            school,
            c,
            'university_scout',
            school.id,
            sources[0]?.url || null,
            { provenanceSuffix: ' · AI-researched, unverified', raw: { ai_researched: true } },
          )
          if (row?.sightingId) {
            newSightings += 1
            fromPerplexity += 1
          }
        }
      } catch (e) {
        errors.push(e.message)
      }
    }
  }

  // 3) Always register birthing surfaces (coverage never empty)
  for (const src of sources.slice(0, 5)) {
    const row = await recordSighting({
      name: `${school.name} · ${src.label}`,
      domain: undefined,
      sourceType: 'university_source',
      sourceId: src.id,
      url: src.url,
      provenance: `School source · ${school.name} · ${src.label} · ${new Date().toISOString().slice(0, 10)}`,
      oneLiner: `Tracked birthing surface for ${school.name}`,
      geography: geographyFor(school),
      raw: { schoolId: school.id, sourceWatch: true, sourceLabel: src.label },
    })
    if (row?.sightingId) newSightings += 1
  }

  const summary = `${school.name}: local ${fromLocal} · AI ${fromPerplexity} · ${sources.length} sources · ${newSightings} writes`
  await finishJob(job.id, {
    status: errors.length && !newSightings ? 'failed' : 'done',
    summary,
    meta: {
      newSightings,
      candidatesFound,
      fromLocal,
      fromPerplexity,
      sourceCount: sources.length,
      errors: errors.slice(0, 5),
    },
  })

  return {
    ok: true,
    schoolId: school.id,
    schoolName: school.name,
    country: school.country,
    tier: school.tier,
    sources: sources.length,
    candidatesFound,
    newSightings,
    fromLocal,
    fromPerplexity,
    perplexity: scoutEnabled(),
    errors: errors.slice(0, 5),
    jobId: job.id,
  }
}

/** Scout all Tier-1 schools (coverage cron). */
export async function runSchoolCoverageSweep({ limit = 8, queriesPerSchool = 1 } = {}) {
  const schools = listSchoolsServer({ tier: 'tier1' }).slice(0, limit)
  const job = await startJob({
    type: 'coverage_cron',
    trigger: `tier1:${schools.length}`,
    meta: { schoolIds: schools.map(s => s.id) },
  })

  const results = []
  for (const s of schools) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runSchoolScout(s.id, { queries: queriesPerSchool }))
  }

  const newSightings = results.reduce((n, r) => n + (r.newSightings || 0), 0)
  await finishJob(job.id, {
    status: 'done',
    summary: `Coverage sweep · ${schools.length} schools · ${newSightings} sightings`,
    meta: { schools: schools.length, newSightings },
  })

  return { ok: true, schools: schools.length, newSightings, results, jobId: job.id }
}
