import crypto from 'crypto'
import { cacheGet, cacheSet } from '@/lib/server-cache'
import {
  createTeamDb,
  joinTeamDb,
  getTeamDb,
  isTeamMemberDb,
  getTeamMemberCount,
  isDbEnabled,
} from '@/lib/db/workspace'

const TEAM_TTL_MS = 365 * 24 * 60 * 60 * 1000

export async function createTeam({ name, ownerId }) {
  const teamId = crypto.randomBytes(4).toString('hex')
  const inviteCode = crypto.randomBytes(4).toString('hex')

  if (isDbEnabled() && ownerId) {
    const team = await createTeamDb({
      teamId,
      name: (name || 'Meridian Team').slice(0, 80),
      inviteCode,
      ownerId,
    })
    return { ...team, memberCount: 1 }
  }

  const team = {
    teamId,
    name: (name || 'Meridian Team').slice(0, 80),
    inviteCode,
    createdAt: new Date().toISOString(),
    ownerId: ownerId || null,
    members: ownerId ? [ownerId] : [],
    memberCount: 1,
  }

  await cacheSet(`team:${teamId}`, team, TEAM_TTL_MS)
  await cacheSet(`team-invite:${inviteCode}`, teamId, TEAM_TTL_MS)
  return team
}

export async function joinTeam(inviteCode, { userId, memberName } = {}) {
  const code = (inviteCode || '').trim().toLowerCase()

  if (isDbEnabled() && userId) {
    const team = await joinTeamDb(code, userId, memberName)
    if (!team) return null
    const memberCount = await getTeamMemberCount(team.teamId)
    return { ...team, memberCount }
  }

  const teamId = await cacheGet(`team-invite:${code}`)
  if (!teamId) return null

  const team = await cacheGet(`team:${teamId}`)
  if (!team) return null

  if (userId) {
    team.members = team.members || (team.ownerId ? [team.ownerId] : [])
    if (!team.members.includes(userId)) team.members.push(userId)
  }
  team.memberCount = (team.members || []).length || (team.memberCount || 1) + 1
  if (memberName) team.lastMember = memberName.slice(0, 60)
  await cacheSet(`team:${teamId}`, team, TEAM_TTL_MS)
  return team
}

export async function getTeam(teamId) {
  if (!teamId) return null

  if (isDbEnabled()) {
    const team = await getTeamDb(teamId)
    if (!team) return null
    const memberCount = await getTeamMemberCount(teamId)
    return {
      teamId: team.id,
      name: team.name,
      inviteCode: team.inviteCode,
      ownerId: team.ownerId,
      createdAt: team.createdAt?.toISOString?.(),
      memberCount,
    }
  }

  return cacheGet(`team:${teamId}`)
}

export async function isTeamMember(userId, teamId) {
  if (!userId || !teamId) return false

  if (isDbEnabled()) {
    return isTeamMemberDb(userId, teamId)
  }

  const team = await cacheGet(`team:${teamId}`)
  if (!team) return false
  return team.ownerId === userId || (team.members || []).includes(userId)
}
