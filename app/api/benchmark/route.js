import { isLedgerEnabled, benchmarkStats, listLedgerEntities, getLatestIndexChecks, listSourceWatches, ledgerIdentity } from '@/lib/server/truth-ledger'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

/**
 * Public earliness benchmark — computed from the live truth ledger.
 * Every number here traces to a database row; nothing is asserted.
 */
export async function GET() {
  if (!isLedgerEnabled()) {
    return Response.json({ enabled: false, reason: 'ledger not configured' })
  }

  const stats = await benchmarkStats()
  if (!stats) {
    return Response.json({ enabled: false, reason: 'ledger unavailable' })
  }

  const entities = await listLedgerEntities(100)
  const checks = await getLatestIndexChecks(entities.map(e => e.id))
  const sourceWatches = await listSourceWatches()

  const rows = entities.map(e => ({
    name: e.name,
    domain: e.domain,
    source: e.source,
    program: e.program,
    cohortDate: e.cohort_date,
    firstObservedAt: e.first_observed_at,
    checks: (checks[e.id] || []).map(c => ({
      index: c.indexName,
      present: c.present,
      checkedAt: c.checkedAt,
    })),
  }))

  return Response.json({
    enabled: true,
    stats,
    rows,
    sourceWatches: sourceWatches.map(w => ({
      label: w.label,
      url: w.url,
      lastCheckedAt: w.last_checked_at,
      lastChangedAt: w.last_changed_at,
      checkCount: w.check_count,
    })),
    honesty: {
      firstObservedAt: 'Timestamp of when Meridian first recorded the company server-side. Accrues from ledger launch; never backdated.',
      indexChecks: 'Falsifiable name searches against public indexes, stored with dates. Harmonic checks planned; StartupHub live.',
      claim: 'We only claim absence where a dated check exists. Everything else is community-sourced, unverified against indexes.',
    },
    identity: await ledgerIdentity(),
    at: new Date().toISOString(),
  })
}
