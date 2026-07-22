import { enforceRateLimit } from '@/lib/api-guard'
import { isLedgerEnabled, recordAttestation } from '@/lib/server/truth-ledger'

export const maxDuration = 15

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Founder profile claim (docs/rebuild-plan.md Phase 3, minimal honest cut).
 * Stored as PENDING — a record only shows "Founder-confirmed" after manual
 * review. No auto-verification is claimed because none is performed yet.
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const { companyName, founderName, email, message, website } = await req.json()

  // Honeypot: bots fill every field; humans never see "website".
  if (website) return Response.json({ ok: true })

  if (!isLedgerEnabled()) {
    return Response.json({ error: 'Claims are temporarily unavailable' }, { status: 503 })
  }

  if (!companyName?.trim() || !EMAIL_RE.test(email || '')) {
    return Response.json({ error: 'Company name and a valid email are required' }, { status: 400 })
  }

  const ok = await recordAttestation({
    companyName: companyName.trim().slice(0, 120),
    founderName: (founderName || '').trim().slice(0, 120) || null,
    claimerEmail: email.trim().slice(0, 160),
    message: (message || '').trim().slice(0, 2000) || null,
  })

  if (!ok) return Response.json({ error: 'Could not save your claim — try again' }, { status: 500 })
  return Response.json({ ok: true })
}
