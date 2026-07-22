/**
 * Cron index-check — thin wrapper around StartupHub name search.
 * Prefer the GH Actions sweep (scripts/ingest/index-check-sweep.mjs) for
 * scheduled runs; this route remains for manual/Vercel trigger.
 */

import { isStartupHubConfigured, checkStartupHubByName } from '@/lib/startuphub'
import {
  isLedgerEnabled,
  listLedgerEntities,
  getLatestIndexChecks,
  recordIndexCheck,
} from '@/lib/server/truth-ledger'

export const maxDuration = 60

const MAX_PER_RUN = Number(process.env.INDEX_CHECK_BATCH || '25')
const RECHECK_DAYS = 7

/**
 * Nightly index check — the receipt engine.
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isLedgerEnabled()) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 })
  }
  if (!isStartupHubConfigured()) {
    return Response.json({ error: 'STARTUPHUB_API_KEY not configured' }, { status: 503 })
  }

  const entities = await listLedgerEntities(500)
  const latest = await getLatestIndexChecks(entities.map(e => e.id))
  const cutoff = Date.now() - RECHECK_DAYS * 86400000

  const due = entities.filter((e) => {
    const checks = latest[e.id] || []
    const sh = checks.find(c => c.indexName === 'StartupHub')
    return !sh || new Date(sh.checkedAt).getTime() < cutoff
  }).slice(0, MAX_PER_RUN)

  const results = []
  for (const entity of due) {
    try {
      const { present, detail } = await checkStartupHubByName(entity.name)
      await recordIndexCheck({
        entityId: entity.id,
        indexName: 'StartupHub',
        present,
        detail,
      })
      results.push({ entity: entity.name, present, detail })
    } catch (e) {
      results.push({ entity: entity.name, error: e.message })
    }
  }

  return Response.json({
    ok: true,
    ledgerEntities: entities.length,
    checked: results.length,
    misses: results.filter(r => r.present === false).length,
    results,
    at: new Date().toISOString(),
  })
}
