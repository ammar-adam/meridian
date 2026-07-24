/**
 * Scout sweep — Perplexity candidate feed for active mandate watches.
 * Extracted from scripts/ingest/scout-sweep.mjs for server/cron use.
 */

import { listAllWatches, recordSighting } from '@/lib/server/company-records'
import { runPerplexityQuery } from '@/lib/discover-research'
import { recordIngestionRun } from '@/lib/server/source-registry'
import { parseScoutCandidates } from '@/lib/sourcing/scout-parse'

function scoutEnabled() {
  const key = process.env.PERPLEXITY_API_KEY?.trim()
  return Boolean(key && key !== 'your_key_here')
}

/**
 * Run scout queries for all mandate watches.
 * NEVER marks results verified or community_first.
 */
export async function runScoutSweep({ watchLimit = 50, queriesPerWatch = 2 } = {}) {
  const startedAt = new Date().toISOString()

  if (!scoutEnabled()) {
    return {
      ok: true,
      skipped: true,
      reason: 'PERPLEXITY_API_KEY missing',
      watches: 0,
      queriesRun: 0,
      newSightings: 0,
    }
  }

  const watches = await listAllWatches({ limit: watchLimit })
  const errors = []
  let queriesRun = 0
  let newSightings = 0
  let candidatesFound = 0

  for (const watch of watches) {
    const thesis = String(watch.thesis || '').trim()
    if (!thesis) continue
    const fundName = watch.fund_name || watch.fund_id || 'mandate'

    // Bias toward school ecosystems (campus incubators, spinouts) matched to mandate.
    const queries = [
      `Early-stage startups from university ecosystems (campus incubators, alumni, lab spinouts) matching this fund mandate: ${thesis}. Prefer CA/US/UK schools. Format: Name | domain.com | one-line why. Date claims when possible.`,
      `Startups announced or launched in the last 30 days from Velocity, DMZ, CDL, or other university-linked programs matching: ${thesis}. List name, website domain if known, one-line description with source.`,
    ]

    for (const query of queries.slice(0, queriesPerWatch)) {
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

  let webhooks = { dispatched: 0, skipped: true }
  if (newSightings > 0 && watches.length) {
    try {
      const { dispatchWatchWebhooks } = await import('@/lib/server/watch-webhooks')
      const events = []
      for (const watch of watches) {
        const fundName = watch.fund_name || watch.fund_id || 'mandate'
        events.push({
          type: 'new_since_last_visit',
          company: `scout batch (${newSightings} new)`,
          domain: null,
          source: 'scout',
          detail: `Scout sweep for "${fundName}" added ${newSightings} sightings`,
        })
      }
      webhooks = await dispatchWatchWebhooks(events.slice(0, 20), {
        fundName: watches[0]?.fund_name,
        thesis: watches[0]?.thesis,
      })
    } catch { /* optional */ }
  }

  return {
    ok: true,
    watches: watches.length,
    queriesRun,
    candidatesFound,
    newSightings,
    webhooks,
    errors: errors.slice(0, 10),
    summary,
  }
}
