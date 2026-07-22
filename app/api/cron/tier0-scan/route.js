import { runDomainRegistryAdapter } from '@/lib/sourcing/domain-registry-adapter'
import { isLedgerEnabled, recordObservations, countLedgerEntities } from '@/lib/server/truth-ledger'

export const maxDuration = 60

/**
 * Tier 0 pre-announcement scan (docs/rebuild-plan.md Phase 2b).
 *
 * New incorporation (Corporations Canada) × live domain — the earliest
 * legally-clean signal class a company emits, before any announcement,
 * cohort, or index. Matches land on the truth ledger as
 * source='domain_registry' and render as "Pre-announcement signal".
 *
 * Auth: Authorization: Bearer CRON_SECRET
 * Optional: ?keywords=ai,robotics&limit=60
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

  const url = new URL(req.url)
  const keywords = (url.searchParams.get('keywords') || 'ai,tech,software,labs,data,robotics,health,bio,quantum,fintech')
    .split(',').map(s => s.trim()).filter(Boolean)
  const limit = Math.min(Number(url.searchParams.get('limit') || '60'), 150)

  const { entities, stats } = await runDomainRegistryAdapter({ keywords, limit, concurrency: 15 })

  const before = await countLedgerEntities()
  const observed = await recordObservations(entities.map(e => ({
    name: e.companyName,
    domain: e.domain,
    source: 'domain_registry',
    provenance: e.provenance,
    cohortDate: e.sourceMeta?.incorporationDate || null,
    sourceMeta: { program: null },
  })))
  const after = await countLedgerEntities()

  return Response.json({
    ok: true,
    tier0: entities.map(e => ({ name: e.companyName, domain: e.domain, provenance: e.provenance })),
    stats,
    ledgerBefore: before,
    ledgerAfter: after,
    newEntities: after - before,
    observed: Object.keys(observed).length,
    at: new Date().toISOString(),
  })
}
