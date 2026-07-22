import {
  isLedgerEnabled,
  listLedgerEntities,
  listUncheckedLedgerEntities,
  recordIndexCheck,
  normalizeEntityId,
  benchmarkStats,
} from '@/lib/server/truth-ledger'
import { isStartupHubConfigured, checkStartupHubByName } from '@/lib/startuphub'
import { listCompanies } from '@/lib/server/company-records'

/**
 * Shared index-check batch (CLI + opportunistic API).
 * Prefers unchecked entities. Backs off hard on StartupHub 429s.
 */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Process-local throttle — survives across requests on a warm lambda.
let _cooldownUntil = 0
let _lastOpportunisticAt = 0

export async function runIndexCheckBatch({ limit = 8, delayMs = 800 } = {}) {
  if (!isLedgerEnabled()) {
    return { enabled: false, reason: 'DATABASE_URL not configured' }
  }
  if (!isStartupHubConfigured()) {
    return { enabled: false, reason: 'STARTUPHUB_API_KEY not configured' }
  }
  if (Date.now() < _cooldownUntil) {
    return {
      enabled: true,
      checked: 0,
      presents: 0,
      misses: 0,
      errors: 0,
      rateLimited: true,
      reason: 'cooldown after StartupHub 429',
      cooldownMs: _cooldownUntil - Date.now(),
    }
  }

  let entities = []
  const unchecked = await listUncheckedLedgerEntities(limit)
  if (unchecked.length) {
    entities = unchecked.map(e => ({
      entityId: e.id || normalizeEntityId(e.name),
      name: e.name,
    }))
  } else {
    const ledger = await listLedgerEntities(limit)
    if (ledger.length) {
      entities = ledger.map(e => ({
        entityId: e.id || normalizeEntityId(e.name),
        name: e.name,
      }))
    } else {
      const companies = await listCompanies({ limit })
      entities = companies.map(c => ({
        entityId: normalizeEntityId(c.name),
        name: c.name,
      })).filter(e => e.entityId)
    }
  }

  if (!entities.length) {
    return { enabled: true, checked: 0, presents: 0, misses: 0, errors: 0, reason: 'no entities' }
  }

  let presents = 0
  let misses = 0
  let errors = 0
  let rateLimited = false
  const results = []

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    try {
      const { present, detail } = await checkStartupHubByName(entity.name)
      await recordIndexCheck({
        entityId: entity.entityId,
        indexName: 'StartupHub',
        present,
        detail,
      })
      if (present) presents += 1
      else misses += 1
      results.push({ entity: entity.name, present, detail })
    } catch (e) {
      errors += 1
      results.push({ entity: entity.name, error: e.message })
      if (/429|rate/i.test(e.message || '')) {
        rateLimited = true
        // Cool down 15 minutes so opportunistic traffic doesn't keep burning quota.
        _cooldownUntil = Date.now() + 15 * 60 * 1000
        break
      }
    }
    if (i < entities.length - 1 && delayMs > 0) await sleep(delayMs)
  }

  return {
    enabled: true,
    checked: results.length,
    presents,
    misses,
    errors,
    rateLimited,
    results: results.slice(0, 20),
    at: new Date().toISOString(),
  }
}

/**
 * Opportunistic: at most once per 10 minutes per warm instance (3 min when force);
 * skips entirely during 429 cooldown.
 */
export async function indexCheckIfStale({ limit = 5, force = false } = {}) {
  if (!isLedgerEnabled() || !isStartupHubConfigured()) {
    return { ran: false, reason: 'disabled' }
  }
  if (Date.now() < _cooldownUntil) {
    return { ran: false, reason: 'cooldown', cooldownMs: _cooldownUntil - Date.now() }
  }
  const throttleMs = force ? 3 * 60 * 1000 : 10 * 60 * 1000
  if (!force && Date.now() - _lastOpportunisticAt < throttleMs) {
    return { ran: false, reason: 'throttled' }
  }
  try {
    const stats = await benchmarkStats()
    if (!stats) return { ran: false, reason: 'no stats' }
    const unchecked = await listUncheckedLedgerEntities(1)
    const needsWork = force || unchecked.length > 0 || (stats.entitiesChecked || 0) < Math.min(stats.entities || 0, 50)
    if (!needsWork) {
      return { ran: false, reason: 'all checked', stats }
    }
    _lastOpportunisticAt = Date.now()
    const result = await runIndexCheckBatch({ limit: force ? Math.max(limit, 15) : limit, delayMs: force ? 700 : 900 })
    return { ran: true, ...result, priorStats: stats }
  } catch (e) {
    console.error('[index-check-batch] indexCheckIfStale:', e.message)
    return { ran: false, error: e.message }
  }
}
