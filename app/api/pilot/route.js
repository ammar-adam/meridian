import { buildPilotCaseStudy } from '@/lib/pilot-case'
import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { runGrantAdapter } from '@/lib/sourcing/grant-adapter'
import {
  isLedgerEnabled,
  countLedgerEntities,
  recordObservations,
  ledgerIdentity,
} from '@/lib/server/truth-ledger'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

/** Backfill the full corpus onto the truth ledger once, without cron ops. */
async function ensureCorpusObserved() {
  if (!isLedgerEnabled()) return { enabled: false }
  try {
    const entities = [...runIncubatorAdapter(), ...runGrantAdapter()]
    const count = await countLedgerEntities()
    if (count >= entities.length) return { enabled: true, count, corpus: entities.length, skipped: true }
    const observed = await recordObservations(entities.map(e => ({
      name: e.companyName,
      domain: e.domain,
      source: e.source,
      provenance: e.provenance,
      cohortDate: e.sourceMeta?.cohortDate || null,
      sourceMeta: { program: e.sourceMeta?.program || null },
    })).filter(c => c.name))
    return { enabled: true, count, corpus: entities.length, observed: Object.keys(observed).length }
  } catch (e) {
    console.error('[pilot] corpus backfill:', e.message)
    return { enabled: true, error: e.message }
  }
}

export async function GET() {
  const ledgerSync = await ensureCorpusObserved()
  const identity = await ledgerIdentity()
  return Response.json({ ...buildPilotCaseStudy(), ledgerSync: { ...ledgerSync, identity } })
}
