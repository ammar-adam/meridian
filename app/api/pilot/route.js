import { buildPilotCaseStudy } from '@/lib/pilot-case'
import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { runGrantAdapter } from '@/lib/sourcing/grant-adapter'
import {
  isLedgerEnabled,
  countLedgerEntities,
  recordObservations,
} from '@/lib/server/truth-ledger'

export const maxDuration = 30

/** Backfill the full corpus onto the truth ledger once, without cron ops. */
async function ensureCorpusObserved() {
  if (!isLedgerEnabled()) return
  try {
    const entities = [...runIncubatorAdapter(), ...runGrantAdapter()]
    const count = await countLedgerEntities()
    if (count >= entities.length) return
    await recordObservations(entities.map(e => ({
      name: e.companyName,
      domain: e.domain,
      source: e.source,
      provenance: e.provenance,
      cohortDate: e.sourceMeta?.cohortDate || null,
      sourceMeta: { program: e.sourceMeta?.program || null },
    })).filter(c => c.name))
  } catch (e) {
    console.error('[pilot] corpus backfill:', e.message)
  }
}

export async function GET() {
  await ensureCorpusObserved()
  return Response.json(buildPilotCaseStudy())
}
