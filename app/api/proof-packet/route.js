import { enforceRateLimit } from '@/lib/api-guard'
import { buildProofPacket, proofPacketToText } from '@/lib/proof-packet'

export const maxDuration = 15

/**
 * Build a proof packet for a Flow / Discover company row.
 * Body: { company, fundName?, thesis?, format?: 'json' | 'text' }
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const body = await req.json()
  const company = body.company
  if (!company?.name && !company?.companyName) {
    return Response.json({ error: 'company required' }, { status: 400 })
  }

  const origin = req.headers.get('origin')
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://meridian-eight-sandy.vercel.app'

  const packet = buildProofPacket(company, {
    origin,
    fundName: body.fundName || body.fundContext?.fundName || '',
    thesis: body.thesis || body.fundContext?.thesis || '',
  })

  if (body.format === 'text') {
    return new Response(proofPacketToText(packet), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return Response.json({ packet, text: proofPacketToText(packet) })
}
