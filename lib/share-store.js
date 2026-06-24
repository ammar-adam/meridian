import crypto from 'crypto'
import { cacheGet, cacheSet } from '@/lib/server-cache'
import {
  createShareDb,
  getShareDb,
  listTeamSharesDb,
  isDbEnabled,
} from '@/lib/db/workspace'

export const SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1000

function shareEnabled() {
  return isDbEnabled() || process.env.MERIDIAN_ENABLE_SHARE_LINKS === 'true'
}

export function isShareEnabled() {
  return shareEnabled()
}

export async function createShare({ memoData, meta = {}, userId = null }) {
  if (!shareEnabled()) {
    throw new Error('Share links require DATABASE_URL')
  }

  const id = crypto.randomBytes(6).toString('base64url')
  const payload = {
    memoData,
    meta: {
      companyName: memoData.COMPANY_NAME,
      fundName: meta.fundName || memoData.FUND_NAME,
      outcome: meta.outcome || null,
      editCount: meta.editCount ?? 0,
      teamId: meta.teamId || null,
      createdBy: meta.createdBy || null,
    },
    createdAt: new Date().toISOString(),
  }

  const expiresAt = new Date(Date.now() + SHARE_TTL_MS)

  if (isDbEnabled()) {
    await createShareDb({
      id,
      userId,
      memoData,
      meta: payload.meta,
      teamId: meta.teamId,
      expiresAt,
    })
    return id
  }

  await cacheSet(`share:${id}`, payload, SHARE_TTL_MS)

  if (meta.teamId) {
    const listKey = `share-team:${meta.teamId}`
    const list = (await cacheGet(listKey)) || []
    list.unshift({
      id,
      companyName: payload.meta.companyName,
      fundName: payload.meta.fundName,
      outcome: payload.meta.outcome,
      createdAt: payload.createdAt,
    })
    await cacheSet(listKey, list.slice(0, 200), SHARE_TTL_MS)
  }

  return id
}

export async function getShare(id) {
  if (!id || !/^[A-Za-z0-9_-]{6,24}$/.test(id)) return null

  if (isDbEnabled()) {
    return getShareDb(id)
  }

  return cacheGet(`share:${id}`)
}

export async function listTeamShares(teamId) {
  if (!teamId) return []

  if (isDbEnabled()) {
    return listTeamSharesDb(teamId)
  }

  return (await cacheGet(`share-team:${teamId}`)) || []
}
