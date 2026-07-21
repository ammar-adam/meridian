import { resolveActorId } from '@/lib/actor-id'
import {
  isLedgerEnabled,
  recordFlowOutcome,
  getFlowOutcomes,
} from '@/lib/server/truth-ledger'

export const maxDuration = 15

/**
 * Server-side pursue/pass outcomes — durable, cross-device memory.
 * localStorage remains a cache; this is the record (docs/rebuild-plan.md).
 */
export async function POST(req) {
  if (!isLedgerEnabled()) {
    return Response.json({ ok: false, reason: 'db off' }, { status: 200 })
  }
  const actorId = await resolveActorId(req)
  const { entityName, domain, outcome, fundName } = await req.json()

  if (!entityName || !['pursue', 'pass'].includes(outcome)) {
    return Response.json({ error: 'entityName and outcome (pursue|pass) required' }, { status: 400 })
  }

  const ok = await recordFlowOutcome({ actorId, entityName, domain, outcome, fundName })
  return Response.json({ ok })
}

export async function GET(req) {
  if (!isLedgerEnabled()) {
    return Response.json({ outcomes: [], enabled: false })
  }
  const actorId = await resolveActorId(req)
  const rows = await getFlowOutcomes(actorId)
  return Response.json({
    enabled: true,
    outcomes: rows.map(r => ({
      entityName: r.entity_name,
      domain: r.domain,
      outcome: r.outcome,
      fundName: r.fund_name,
      createdAt: r.created_at,
    })),
  })
}
