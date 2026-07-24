/**
 * School-scoped scout — find startups tied to a university ecosystem.
 * Writes sightings with provenance; never marks verified/community_first.
 */

import { recordSighting } from '@/lib/server/company-records'
import { runPerplexityQuery } from '@/lib/discover-research'
import { parseScoutCandidates } from '@/lib/sourcing/scout-parse'
import { getSchool, listSchoolsServer, sourcesForSchool } from '@/lib/schools/registry'
import { startJob, finishJob } from '@/lib/server/agent-jobs'

function scoutEnabled() {
  const key = process.env.PERPLEXITY_API_KEY?.trim()
  return Boolean(key && key !== 'your_key_here')
}

function schoolFromId(schoolId) {
  return listSchoolsServer().find(s => s.id === schoolId)
    || getSchool(schoolId)
}

/**
 * Scout one school. If Perplexity is off, still records provenance stubs
 * from known source URLs so the demo path isn't empty.
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

  if (scoutEnabled()) {
    const q = [
      `Early-stage startups founded by ${school.name} students or alumni in the last 24 months. Return company name, domain if known, one-line description. Prefer pre-seed and seed.`,
      `Companies coming out of ${school.name} entrepreneurship programs, incubators, or lab spinouts. List name, website domain if known, one-line why.`,
    ]
    for (const query of q.slice(0, queries)) {
      try {
        const text = await runPerplexityQuery(query)
        const candidates = parseScoutCandidates(text)
        candidatesFound += candidates.length
        for (const c of candidates) {
          const provenance = `School scout · ${school.name} · AI-researched, unverified · ${new Date().toISOString().slice(0, 10)}`
          const row = await recordSighting({
            name: c.name,
            domain: c.domain || undefined,
            sourceType: 'university_scout',
            sourceId: school.id,
            url: sources[0]?.url || null,
            provenance,
            oneLiner: c.why || null,
            geography: school.country === 'CA' ? 'Canada' : school.country === 'UK' ? 'United Kingdom' : 'United States',
            raw: {
              schoolId: school.id,
              schoolName: school.name,
              country: school.country,
              tier: school.tier,
              ai_researched: true,
              verified: false,
              community_first: false,
            },
          })
          if (row?.sightingId) newSightings += 1
        }
      } catch (e) {
        errors.push(e.message)
      }
    }
  } else {
    // Offline / no key: mark that sources exist so coverage UI still works.
    for (const src of sources.slice(0, 3)) {
      const row = await recordSighting({
        name: `${school.name} ecosystem (source watch)`,
        domain: undefined,
        sourceType: 'university_source',
        sourceId: src.id,
        url: src.url,
        provenance: `School source registered · ${school.name} · ${src.label} · ${new Date().toISOString().slice(0, 10)}`,
        oneLiner: `Tracked birthing surface for ${school.name}`,
        geography: school.country === 'CA' ? 'Canada' : school.country === 'UK' ? 'United Kingdom' : 'United States',
        raw: { schoolId: school.id, placeholder: true, sourceLabel: src.label },
      })
      if (row?.sightingId) newSightings += 1
    }
  }

  const summary = `${school.name}: ${candidatesFound} candidates → ${newSightings} sightings · ${sources.length} sources`
  await finishJob(job.id, {
    status: errors.length && !newSightings ? 'failed' : 'done',
    summary,
    meta: { newSightings, candidatesFound, sourceCount: sources.length, errors: errors.slice(0, 5) },
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
