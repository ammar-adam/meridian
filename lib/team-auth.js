import { requireUserId } from '@/lib/auth-server'
import { isTeamMember } from '@/lib/team-store'

/** Require signed-in user who belongs to teamId */
export async function requireTeamMember(teamId) {
  const auth = await requireUserId()
  if (auth.error) return auth

  if (!teamId) {
    return { error: Response.json({ error: 'teamId required' }, { status: 400 }) }
  }

  const member = await isTeamMember(auth.userId, teamId)
  if (!member) {
    return { error: Response.json({ error: 'Not a team member' }, { status: 403 }) }
  }

  return { userId: auth.userId }
}
