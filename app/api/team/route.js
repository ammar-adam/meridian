import { enforceRateLimit } from '@/lib/api-guard'
import { requireUserId } from '@/lib/auth-server'
import { createTeam, joinTeam, getTeam } from '@/lib/team-store'
import { isDbEnabled } from '@/lib/db/workspace'

export const maxDuration = 30

export async function POST(req) {
  const limited = enforceRateLimit(req, 'team')
  if (limited) return limited

  const auth = await requireUserId()
  if (auth.error) return auth.error

  const body = await req.json()
  const { action } = body

  try {
    if (action === 'create') {
      const team = await createTeam({ name: body.name, ownerId: auth.userId })
      return Response.json(team)
    }

    if (action === 'join') {
      const team = await joinTeam(body.inviteCode, {
        userId: auth.userId,
        memberName: body.memberName,
      })
      if (!team) {
        return Response.json({ error: 'Invalid invite code' }, { status: 404 })
      }
      return Response.json(team)
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[team] error:', err.message)
    return Response.json({ error: 'Team request failed' }, { status: 500 })
  }
}

export async function GET(req) {
  const limited = enforceRateLimit(req, 'team')
  if (limited) return limited

  const teamId = new URL(req.url).searchParams.get('teamId')
  if (!teamId) {
    return Response.json({ error: 'teamId required' }, { status: 400 })
  }

  const team = await getTeam(teamId)
  if (!team) {
    return Response.json({ error: 'Team not found' }, { status: 404 })
  }

  return Response.json({ ...team, durable: isDbEnabled() })
}
