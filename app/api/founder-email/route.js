import { guessFounderEmails } from '@/lib/founder-email'
import { enforceRateLimit } from '@/lib/api-guard'

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'research')
  if (limited) return limited

  const { founderName, domain } = await req.json()
  if (!founderName?.trim() || !domain?.trim()) {
    return Response.json({ error: 'founderName and domain are required' }, { status: 400 })
  }

  const candidates = await guessFounderEmails(founderName, domain)
  return Response.json({ candidates })
}
