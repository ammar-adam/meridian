import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isSourceRegistryEnabled,
  listActiveSources,
  upsertSource,
  markSourceRun,
  recordIngestionRun,
  normalizeCadence,
} from '@/lib/server/source-registry'
import { visibleTextHash } from '@/lib/server/source-watch'
import { extractEntitiesFromHtml } from '@/lib/server/extractor'
import { recordSighting, upsertPerson, linkPersonToCompany, countCompanies } from '@/lib/server/company-records'
import { recordObservations } from '@/lib/server/truth-ledger'

/**
 * Shared ingestion batch (CLI + opportunistic API).
 * Keeps serverless runs small: caller sets limit (2–5 for request-path, 40 for Actions).
 */

const LLM_TYPES = new Set(['university', 'incubator', 'accelerator', 'launch'])

let _seededOnce = false

/** Upsert source-seeds.json into the sources table (idempotent). */
export async function seedSourcesFromBundledFile() {
  if (!isSourceRegistryEnabled()) return { enabled: false }
  try {
    const path = join(process.cwd(), 'lib/sourcing/source-seeds.json')
    const seeds = JSON.parse(readFileSync(path, 'utf8'))
    let ok = 0
    let fail = 0
    for (const seed of seeds) {
      const id = await upsertSource(seed)
      if (id) ok += 1
      else fail += 1
    }
    _seededOnce = true
    return { enabled: true, seeded: ok, failed: fail, total: seeds.length }
  } catch (e) {
    console.error('[ingest-batch] seedSources:', e.message)
    return { enabled: true, error: e.message }
  }
}

/**
 * Process up to `limit` stale/never-run LLM sources for a cadence.
 * One source failure never aborts the batch.
 */
export async function runIngestBatch({
  cadence = 'daily',
  limit = 3,
  dryRun = false,
} = {}) {
  if (!isSourceRegistryEnabled()) {
    return { enabled: false, reason: 'DATABASE_URL not configured' }
  }

  const norm = normalizeCadence(cadence)
  const startedAt = new Date().toISOString()
  const errors = []
  let sourcesChecked = 0
  let sourcesSkippedUnchanged = 0
  let sourcesFailed = 0
  let newSightings = 0
  let extractedTotal = 0

  // Ensure seeds exist at least once per cold start.
  if (!_seededOnce) {
    await seedSourcesFromBundledFile()
  }

  const sources = await listActiveSources({ cadence: norm, limit: Math.max(limit * 3, limit) })
  const toProcess = sources
    .filter(s => LLM_TYPES.has(s.type) || !s.type)
    .slice(0, limit)

  for (const source of toProcess) {
    sourcesChecked += 1
    try {
      const res = await fetch(source.url, {
        headers: { 'User-Agent': 'MeridianIngest/1.0 (+cohort extraction)' },
        signal: AbortSignal.timeout(20_000),
        redirect: 'follow',
        cache: 'no-store',
      })
      if (!res.ok) {
        sourcesFailed += 1
        const msg = `HTTP ${res.status}`
        errors.push({ url: source.url, error: msg })
        if (!dryRun) await markSourceRun({ url: source.url, error: msg })
        continue
      }

      const html = await res.text()
      const hash = visibleTextHash(html)

      if (source.last_hash && source.last_hash === hash) {
        sourcesSkippedUnchanged += 1
        if (!dryRun) await markSourceRun({ url: source.url, hash })
        continue
      }

      if (dryRun) continue

      const { companies, model, skipped, reason } = await extractEntitiesFromHtml(html, {
        url: source.url,
        sourceLabel: source.label || source.id,
      })

      if (skipped) errors.push({ url: source.url, error: reason || 'extract_skipped' })
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

        if (result?.companyId) {
          // Keep truth ledger in sync so index checks cover newly ingested rows.
          await recordObservations([{
            name: c.name,
            domain: c.domain || null,
            source: source.type || 'incubator',
            provenance,
            cohortDate: c.cohort_date || null,
          }])
        }

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
      if (!dryRun) {
        try { await markSourceRun({ url: source.url, error: e.message }) } catch { /* ignore */ }
      }
    }
  }

  const finishedAt = new Date().toISOString()
  const companyCount = await countCompanies()
  const summary = [
    `cadence=${norm}`,
    `checked=${sourcesChecked}`,
    `unchanged=${sourcesSkippedUnchanged}`,
    `failed=${sourcesFailed}`,
    `extracted=${extractedTotal}`,
    `sightings=${newSightings}`,
    dryRun ? 'dry-run' : null,
  ].filter(Boolean).join(' · ')

  if (!dryRun && sourcesChecked > 0) {
    await recordIngestionRun({
      startedAt,
      finishedAt,
      sourcesChecked,
      newCompanies: companyCount,
      newSightings,
      errors: errors.slice(0, 50),
      summary,
    })
  }

  return {
    enabled: true,
    cadence: norm,
    dryRun,
    sourcesChecked,
    sourcesSkippedUnchanged,
    sourcesFailed,
    extractedTotal,
    newSightings,
    companyCount,
    errors: errors.slice(0, 20),
    summary,
    startedAt,
    finishedAt,
  }
}

/**
 * Opportunistic: seed if empty, then ingest a tiny batch when sources look stale.
 * Safe for request-path (pilot/benchmark) — hard-capped at `limit` sources.
 */
export async function ingestIfStale({ maxAgeHours = 12, limit = 2 } = {}) {
  if (!isSourceRegistryEnabled()) return { ran: false, reason: 'disabled' }
  try {
    const seed = await seedSourcesFromBundledFile()
    const sources = await listActiveSources({ limit: 20 })
    if (!sources.length) {
      return { ran: false, reason: 'no sources after seed', seed }
    }

    const now = Date.now()
    const stale = sources.filter((s) => {
      if (!s.last_run_at) return true
      const ageH = (now - new Date(s.last_run_at).getTime()) / 3600000
      return ageH >= maxAgeHours
    })

    if (!stale.length) {
      return { ran: false, reason: 'fresh', sourceCount: sources.length, seed }
    }

    // Prefer never-run sources first (listActiveSources already orders NULLS FIRST).
    const result = await runIngestBatch({ cadence: 'daily', limit })
    return { ran: true, seed, ...result }
  } catch (e) {
    console.error('[ingest-batch] ingestIfStale:', e.message)
    return { ran: false, error: e.message }
  }
}
