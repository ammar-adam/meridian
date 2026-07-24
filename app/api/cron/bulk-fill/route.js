import { isCronAuthorized } from '@/lib/health-payload'
import { runStartupHubBulk, STARTUPHUB_BULK_QUERIES } from '@/lib/server/startuphub-bulk'
import { runDomainRegistryAdapter } from '@/lib/sourcing/domain-registry-adapter'
import { runFormDAdapter } from '@/lib/sourcing/form-d-adapter'
import { recordSighting } from '@/lib/server/company-records'
import { recordObservations } from '@/lib/server/truth-ledger'
import { seedSourcesFromBundledFile, runIngestBatch } from '@/lib/server/ingest-batch'
import { runIndexCheckBatch } from '@/lib/server/index-check-batch'
import { countCompanies } from '@/lib/server/company-records'
import { runSchoolCoverageSweep } from '@/lib/server/school-scout'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const REGISTRY_KEYWORD_SETS = [
  ['ai', 'tech', 'software', 'labs', 'data', 'robotics', 'health', 'fintech'],
  ['pay', 'capital', 'finance', 'bio', 'quantum', 'climate', 'energy', 'security'],
  ['marketplace', 'platform', 'cloud', 'mobile', 'digital', 'smart', 'green', 'med'],
]

/**
 * Bulk corpus fill — EOD path to 10k+ companies.
 * Auth: Authorization: Bearer CRON_SECRET
 *
 * Query params:
 *   phase=startuphub|registry|formd|scrape|index|schools|all (default all)
 *   offset=N — StartupHub query offset (for chunked runs)
 *   queries=25 — StartupHub queries per request
 *   registryLimit=400 — domain registry probe cap
 *   formdLimit=150 — Form D filings cap
 *   scrapeLimit=20 — LLM source pages per request
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!isCronAuthorized(req.headers.get('authorization') || '', secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const phase = url.searchParams.get('phase') || 'all'
  let offset = Number(url.searchParams.get('offset') || '0')
  if (url.searchParams.get('autoOffset') === '1' && !url.searchParams.has('offset')) {
    const day = Math.floor(Date.now() / 86_400_000)
    offset = (day * 12) % STARTUPHUB_BULK_QUERIES.length
  }
  const queryBatch = Math.min(Number(url.searchParams.get('queries') || '25'), 40)
  const registryLimit = Math.min(Number(url.searchParams.get('registryLimit') || '400'), 800)
  const formdLimit = Math.min(Number(url.searchParams.get('formdLimit') || '150'), 300)
  const scrapeLimit = Math.min(Number(url.searchParams.get('scrapeLimit') || '15'), 30)
  const perQueryLimit = Math.min(Number(url.searchParams.get('perQueryLimit') || '100'), 100)

  const out = { ok: true, phase, at: new Date().toISOString() }
  const before = await countCompanies()

  if (phase === 'all' || phase === 'schools') {
    try {
      out.schools = await runSchoolCoverageSweep({
        limit: Math.min(Number(url.searchParams.get('schoolLimit') || '6'), 13),
        queriesPerSchool: 1,
      })
    } catch (e) {
      out.schools = { error: e.message }
    }
  }

  if (phase === 'all' || phase === 'startuphub') {
    out.startuphub = await runStartupHubBulk({
      offset,
      queryBatch,
      perQueryLimit,
      delayMs: 300,
    })
  }

  if (phase === 'all' || phase === 'registry') {
    let registrySightings = 0
    const registryErrors = []
    for (const keywords of REGISTRY_KEYWORD_SETS) {
      try {
        const { entities } = await runDomainRegistryAdapter({
          keywords,
          province: '',
          limit: Math.floor(registryLimit / REGISTRY_KEYWORD_SETS.length),
          concurrency: 25,
        })
        for (const e of entities || []) {
          const r = await recordSighting({
            name: e.companyName,
            domain: e.domain,
            sourceType: 'registry',
            sourceId: 'domain_registry',
            provenance: e.provenance,
            geography: e.sourceMeta?.geography || 'Canada',
            stage: e.sourceMeta?.stage || 'pre-seed',
            raw: { sourceMeta: e.sourceMeta },
          })
          if (r?.sightingId) registrySightings += 1
          if (r?.companyId) {
            await recordObservations([{
              name: e.companyName,
              domain: e.domain,
              source: 'domain_registry',
              provenance: e.provenance,
            }])
          }
        }
      } catch (e) {
        registryErrors.push(e.message)
      }
    }
    out.registry = { newSightings: registrySightings, errors: registryErrors }
  }

  if (phase === 'all' || phase === 'formd') {
    let formdSightings = 0
    try {
      const { entities, error } = await runFormDAdapter({ limit: formdLimit, days: 90 })
      for (const e of entities || []) {
        const r = await recordSighting({
          name: e.companyName,
          domain: undefined,
          sourceType: 'capital',
          sourceId: 'form_d',
          provenance: e.provenance || 'SEC Form D · candidate',
          geography: 'US',
          raw: { sourceMeta: e.sourceMeta },
        })
        if (r?.sightingId) formdSightings += 1
        if (r?.companyId) {
          await recordObservations([{
            name: e.companyName,
            source: 'form_d',
            provenance: e.provenance,
          }])
        }
      }
      out.formd = { newSightings: formdSightings, error: error || null, count: entities?.length || 0 }
    } catch (e) {
      out.formd = { error: e.message }
    }
  }

  if (phase === 'all' || phase === 'scrape') {
    out.seed = await seedSourcesFromBundledFile()
    out.scrape = await runIngestBatch({ cadence: 'daily', limit: scrapeLimit })
  }

  if (phase === 'all' || phase === 'index') {
    out.indexCheck = await runIndexCheckBatch({ limit: 15, delayMs: 900 })
  }

  const after = await countCompanies()
  out.companyRecords = { before, after, delta: (after ?? 0) - (before ?? 0) }
  out.next = out.startuphub?.done === false
    ? `/api/cron/bulk-fill?phase=startuphub&offset=${out.startuphub.nextOffset}&queries=${queryBatch}`
    : null

  return Response.json(out)
}
