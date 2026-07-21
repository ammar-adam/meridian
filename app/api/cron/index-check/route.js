import { isStartupHubConfigured } from '@/lib/startuphub'
import {
  isLedgerEnabled,
  listLedgerEntities,
  getLatestIndexChecks,
  recordIndexCheck,
} from '@/lib/server/truth-ledger'

export const maxDuration = 60

const API_BASE = process.env.STARTUPHUB_API_BASE || 'https://www.startuphub.ai/api/v1'
const MAX_PER_RUN = Number(process.env.INDEX_CHECK_BATCH || '25')
const RECHECK_DAYS = 7

/** Same falsifiable name test as scripts/verify-falsifiable-test.mjs. */
function nameHit(hay, companyName) {
  const h = String(hay || '').toLowerCase()
  const n = String(companyName || '').toLowerCase()
  if (!n) return false
  if (h.includes(n)) return true
  const compact = n.replace(/[^a-z0-9]/g, '')
  return compact.length >= 4 && h.replace(/[^a-z0-9]/g, '').includes(compact)
}

async function checkStartupHubByName(name) {
  const params = new URLSearchParams({ q: name, limit: '10', sort: '-created_at' })
  const res = await fetch(`${API_BASE}/startups?${params}`, {
    headers: {
      Authorization: `Bearer ${process.env.STARTUPHUB_API_KEY}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`startuphub ${res.status}`)
  const data = await res.json()
  const items = data.data ?? data.results ?? []
  const hit = items.find(item => nameHit(item.name, name) || nameHit(name, item.name))
  return {
    present: Boolean(hit),
    detail: hit
      ? `Name match: ${hit.name}`
      : `Name search returned ${items.length} results, no match`,
  }
}

/**
 * Nightly index check — the receipt engine.
 * For each ledger entity without a recent check, run a falsifiable
 * StartupHub name search and store the dated result. Honest by design:
 * a miss is recorded as a miss, a hit as a hit.
 *
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
