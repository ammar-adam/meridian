import { runIncubatorAdapter } from '@/lib/sourcing/incubator-adapter'
import { runGrantAdapter } from '@/lib/sourcing/grant-adapter'
import { runEventHostAdapter } from '@/lib/sourcing/event-host-adapter'
import { listLedgerEntities, normalizeEntityId } from '@/lib/server/truth-ledger'
import {
  isRecordsEnabled,
  countCompanies,
  recordSighting,
  upsertPerson,
  linkPersonToCompany,
} from '@/lib/server/company-records'

/**
 * One-time (count-guarded) migration of the seed corpus into company records.
 * first_observed_at carries over from ledger_entities where one exists —
 * the ledger's "never backdated, never reset" rule survives the migration.
 */
export async function ensureCompanyRecords() {
  if (!isRecordsEnabled()) return { enabled: false }
  try {
    const entities = [
      ...runIncubatorAdapter(),
      ...runGrantAdapter(),
      ...runEventHostAdapter(),
    ].filter(e => e.companyName)

    const count = await countCompanies()
    if (count != null && count >= entities.length) {
      return { enabled: true, count, corpus: entities.length, skipped: true }
    }

    const ledgerRows = await listLedgerEntities(500)
    const firstSeenByName = {}
    for (const r of ledgerRows) {
      firstSeenByName[r.id] = r.first_observed_at
    }

    let migrated = 0
    for (const e of entities) {
      const ledgerFirstSeen = firstSeenByName[normalizeEntityId(e.companyName)]
      const res = await recordSighting({
        name: e.companyName,
        domain: e.domain,
        sourceType: e.source,
        sourceId: e.sourceMeta?.program || null,
        cohortDate: e.sourceMeta?.cohortDate || null,
        provenance: e.provenance,
        geography: e.sourceMeta?.geography || null,
        stage: e.sourceMeta?.stage || null,
        sectors: e.sourceMeta?.sector ? [e.sourceMeta.sector] : null,
        firstObservedAt: ledgerFirstSeen || undefined,
        raw: { entityId: e.id, confidence: e.confidence },
      })
      if (!res) continue
      migrated += 1

      if (e.personName) {
        for (const founderName of e.personName.split(',').map(s => s.trim()).filter(Boolean)) {
          const personId = await upsertPerson({ name: founderName })
          if (personId) await linkPersonToCompany(res.companyId, personId, 'founder')
        }
      }
    }

    return { enabled: true, before: count, corpus: entities.length, migrated }
  } catch (e) {
    console.error('[records-backfill]', e.message)
    return { enabled: true, error: e.message }
  }
}
