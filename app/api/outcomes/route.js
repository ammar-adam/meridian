import { enforceRateLimit } from '@/lib/api-guard'
import { resolveActorId } from '@/lib/actor-id'
import { validateOutcomePayload } from '@/lib/outcome-validation'
import {
  isLedgerEnabled,
  recordFlowOutcome,
  getFlowOutcomes,
  purgeTestOutcomes,
} from '@/lib/server/truth-ledger'

export const maxDuration = 15

// Purge synthetic audit rows once per server instance — cheap and idempotent.
let _purged = false

/**
 * Server-side pursue/pass outcomes — durable, cross-device memory.
 * localStorage remains a cache; this is the record (docs/rebuild-plan.md).
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'outcomes')
  if (limited) return limited

  if (!isLedgerEnabled()) {
    return Response.json({ ok: false, reason: 'db off' }, { status: 200 })
  }
  const actorId = await resolveActorId(req)
  if (actorId === 'guest') {
    return Response.json(
      { error: 'Sign in or use a registered device to record outcomes' },
      { status: 401 },
    )
  }
  const validated = validateOutcomePayload(await req.json())
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { entityName, domain, outcome, fundName } = validated.value
  const ok = await recordFlowOutcome({ actorId, entityName, domain, outcome, fundName })
  return Response.json({ ok })
}

export async function GET(req) {
  if (!isLedgerEnabled()) {
    return Response.json({ outcomes: [], enabled: false })
  }
  if (!_purged) {
    _purged = true
    await purgeTestOutcomes()
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
