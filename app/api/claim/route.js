import { enforceRateLimit } from '@/lib/api-guard'
import { resolveActorId } from '@/lib/actor-id'
import { validateClaimPayload } from '@/lib/claim-validation'
import { isLedgerEnabled, recordAttestation } from '@/lib/server/truth-ledger'

export const maxDuration = 15

/**
 * Founder profile claim (docs/rebuild-plan.md Phase 3, minimal honest cut).
 * Stored as PENDING — a record only shows "Founder-confirmed" after manual
 * review. No auto-verification is claimed because none is performed yet.
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const body = await req.json()

  // Honeypot: bots fill every field; humans never see "website".
  if (body?.website) return Response.json({ ok: true })

  if (!isLedgerEnabled()) {
    return Response.json({ error: 'Claims are temporarily unavailable' }, { status: 503 })
  }

  const actorId = await resolveActorId(req)
  if (actorId === 'guest') {
    return Response.json(
      { error: 'Sign in or use a registered device to submit a claim' },
      { status: 401 },
    )
  }

  const validated = validateClaimPayload(body)
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const ok = await recordAttestation(validated.value)

  if (!ok) return Response.json({ error: 'Could not save your claim — try again' }, { status: 500 })
  return Response.json({ ok: true })
}
