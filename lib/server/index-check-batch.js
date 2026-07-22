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
 * Prefers unchecked entities so coverage keeps growing.
 */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export async function runIndexCheckBatch({ limit = 8, delayMs = 250 } = {}) {
  if (!isLedgerEnabled()) {
    return { enabled: false, reason: 'DATABASE_URL not configured' }
  }
  if (!isStartupHubConfigured()) {
    return { enabled: false, reason: 'STARTUPHUB_API_KEY not configured' }
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
    }
    if (i < entities.length - 1 && delayMs > 0) await sleep(delayMs)
  }

  return {
    enabled: true,
    checked: results.length,
    presents,
    misses,
    errors,
    results: results.slice(0, 20),
    at: new Date().toISOString(),
  }
}

/** Opportunistic: if unchecked entities remain, run a small batch. */
export async function indexCheckIfStale({ limit = 5 } = {}) {
  if (!isLedgerEnabled() || !isStartupHubConfigured()) {
    return { ran: false, reason: 'disabled' }
  }
  try {
    const stats = await benchmarkStats()
    if (!stats) return { ran: false, reason: 'no stats' }
    const unchecked = await listUncheckedLedgerEntities(1)
    const needsWork = unchecked.length > 0 || (stats.entitiesChecked || 0) === 0
    if (!needsWork) {
      return { ran: false, reason: 'all checked', stats }
    }
    const result = await runIndexCheckBatch({ limit })
    return { ran: true, ...result, priorStats: stats }
  } catch (e) {
    console.error('[index-check-batch] indexCheckIfStale:', e.message)
    return { ran: false, error: e.message }
  }
}
