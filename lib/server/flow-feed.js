/**
 * Shared server-side Flow feed builder — used by /api/flow, /api/benchmark, cron jobs.
 */

import { buildIncubatorFlowDiscover } from '@/lib/discover-fast'
import { buildCoverageProof, annotateCoverage, coverageSummary } from '@/lib/coverage-proof'
import { buildLedgerEntry, ledgerSummary, annotateLedger } from '@/lib/freshness-ledger'
import { annotateReachability, reachabilitySummary } from '@/lib/reachability'
import {
  isLedgerEnabled,
  recordObservations,
  getLatestIndexChecks,
  normalizeEntityId,
} from '@/lib/server/truth-ledger'
import { isRecordsEnabled, listFlowRecords } from '@/lib/server/company-records'
import { matchMandate, inferGeosFromThesis } from '@/lib/server/mandate-match'
import { isCanadianMandate } from '@/lib/geography-utils'
import { filterFlowFeed, countBriefable } from '@/lib/flow-quality'
import { flagSerialFounders, getSerialFounderFlags } from '@/lib/server/founder-graph'
import { detectWatchEvents, dedupeWatchEvents } from '@/lib/server/watch-events'
import { dispatchWatchWebhooks } from '@/lib/server/watch-webhooks'
import { computeFlowFeedStats } from '@/lib/flow-feed-stats'

function recordsToFlowCompanies(rows = []) {
  return rows.map((c) => {
    const source = c.latest_source || 'record'
    const isScout = source === 'scout'
    return {
      companyId: c.id,
      name: c.name,
      domain: c.domain || null,
      description: c.one_liner || '',
      geography: c.geography || null,
      stage: c.stage || null,
      sectors: c.sectors || null,
      sector: Array.isArray(c.sectors) ? c.sectors.join(' / ') : null,
      source,
      unverified: isScout,
      sourceConfidence: isScout ? 'low' : undefined,
      provenance: c.latest_provenance
        || (isScout
          ? `Scout candidate · first observed ${String(c.first_observed_at || '').slice(0, 10)}`
          : `Company record · first observed ${String(c.first_observed_at || '').slice(0, 10)}`),
      cohortDate: null,
      sourceMeta: {
        geography: c.geography || null,
        stage: c.stage || null,
      },
      meridianFirstSeen: c.first_observed_at,
    }
  })
}

function mergeByKey(primary, extra) {
  const map = new Map()
  for (const c of [...extra, ...primary]) {
    const key = (c.domain || c.name || '').toLowerCase().trim()
    if (!key) continue
    const prev = map.get(key)
    if (!prev) {
      map.set(key, c)
      continue
    }
    map.set(key, {
      ...c,
      ...prev,
      personName: prev.personName || c.personName,
      domain: prev.domain || c.domain,
      source: prev.source !== 'record' ? prev.source : c.source,
      provenance: prev.provenance || c.provenance,
      meridianFirstSeen: prev.meridianFirstSeen || c.meridianFirstSeen,
    })
  }
  return [...map.values()]
}

function splitFounderNames(personName) {
  if (!personName) return []
  return String(personName)
    .split(/,| & | and /i)
    .map(s => s.trim())
    .filter(Boolean)
}

async function annotateSerialFounders(companies = []) {
  if (!companies.length) return companies

  const links = []
  for (const c of companies) {
    const companyId = c.companyId || c.domain || c.name
    for (const name of splitFounderNames(c.personName)) {
      links.push({ personId: name.toLowerCase(), companyId, companyName: c.name })
    }
  }
  const inferred = flagSerialFounders(links)

  const dbIds = [...new Set(companies.map(c => c.companyId).filter(Boolean))]
  let dbFlags = {}
  if (dbIds.length) {
    try {
      dbFlags = await getSerialFounderFlags(dbIds)
    } catch { /* optional */ }
  }

  return companies.map((c) => {
    const key = c.companyId || c.domain || c.name
    const flag = dbFlags[c.companyId] || inferred[key]
    if (!flag?.serial) return c
    return {
      ...c,
      serialFounder: true,
      priorCompanies: flag.priorCompanies?.slice(0, 4) || [],
    }
  })
}

async function withTruthLedger(companies) {
  if (!isLedgerEnabled() || !companies?.length) {
    return { companies, truthLedger: { enabled: false } }
  }
  const observed = await recordObservations(companies)
  const checks = await getLatestIndexChecks(Object.keys(observed))

  const merged = companies.map((c) => {
    const id = normalizeEntityId(c.name)
    const obs = observed[id]
    const entityChecks = checks[id]
    if (!obs && !entityChecks?.length) return c

    const withChecks = entityChecks?.length
      ? { ...c, checks: entityChecks, indexChecks: entityChecks }
      : { ...c }

    const ledger = buildLedgerEntry(withChecks)
    if (obs) ledger.meridianFirstSeen = obs.firstObservedAt
    if (entityChecks?.length) ledger.indexChecks = entityChecks

    const coverage = buildCoverageProof(withChecks)

    return {
      ...withChecks,
      ledger,
      coverage,
      notInHarmonicLikely: coverage.notInHarmonicLikely,
    }
  })

  return {
    companies: merged,
    truthLedger: { enabled: true, observed: Object.keys(observed).length },
  }
}

/**
 * Build mandate-matched deal flow feed (incubator + DB records including scout).
 */
export async function buildFlowFeed({ thesis, fundContext, sinceIso = null, dispatchWebhooks = false, actorId = null } = {}) {
  const text = (thesis || fundContext?.thesis || '').trim()
  if (!text) {
    return { error: 'Mandate thesis required', companies: [], meta: {} }
  }
  if (!fundContext?.fundName) {
    return { error: 'Choose a fund to watch deal flow', companies: [], meta: {} }
  }

  const payload = buildIncubatorFlowDiscover(text, fundContext)
  let companies = payload.companies || []
  let recordsMerged = 0
  let scoutMerged = 0

  if (isRecordsEnabled()) {
    try {
      const rows = await listFlowRecords({ limit: 400 })
      if (rows.length) {
        const fromRecords = recordsToFlowCompanies(rows)
        scoutMerged = fromRecords.filter(c => c.source === 'scout').length
        const before = companies.length
        const geos = inferGeosFromThesis(text)
        const canadaLed = isCanadianMandate(geos, fundContext)
        // Non-Canada mandates: lead with global DB records, not incubator-only seeds.
        const merged = canadaLed
          ? mergeByKey(companies, fromRecords)
          : mergeByKey(fromRecords, companies)
        const rematched = matchMandate(
          annotateReachability(annotateLedger(annotateCoverage(merged))),
          { thesis: text, fundContext },
        )
        companies = rematched.companies
        recordsMerged = Math.max(0, companies.length - before)
        payload.meta = {
          ...payload.meta,
          coverageBanner: rematched.meta.coverageBanner,
          canadianMandate: rematched.meta.canadianMandate,
          match: rematched.meta,
          coverage: coverageSummary(companies),
          reachability: reachabilitySummary(companies),
          ledger: ledgerSummary(companies),
        }
      }
    } catch (e) {
      console.warn('[flow-feed] company records merge skipped:', e.message)
    }
  }

  const { companies: withLedger, truthLedger } = await withTruthLedger(companies)
  const withSerial = await annotateSerialFounders(withLedger)
  const { companies: feedCompanies, hiddenCount } = filterFlowFeed(withSerial)
  const feedStats = computeFlowFeedStats(feedCompanies)

  const watchEvents = dedupeWatchEvents(detectWatchEvents(feedCompanies, { sinceIso }))
  let webhooks = { dispatched: 0, skipped: true }

  if (dispatchWebhooks && watchEvents.length) {
    try {
      webhooks = await dispatchWatchWebhooks(watchEvents, {
        actorId,
        fundName: fundContext.fundName,
        thesis: text,
      })
    } catch { /* optional */ }
  }

  return {
    companies: feedCompanies,
    meta: {
      ...payload.meta,
      ledger: ledgerSummary(feedCompanies),
      truthLedger,
      recordsMerged,
      scoutMerged,
      thinRowsHidden: hiddenCount,
      briefReadyCount: countBriefable(feedCompanies),
      flow: true,
      thesis: text,
      feedStats,
      watchEvents: watchEvents.slice(0, 30),
      webhooks,
      generatedAt: new Date().toISOString(),
    },
    watchEvents,
  }
}
