import { eq, and, gt, desc } from 'drizzle-orm'
import { getDb, isDbEnabled, schema } from '@/lib/db'

const { workspaces, memos, edits, shares, teams, teamMembers } = schema

export async function getWorkspace(userId) {
  const db = getDb()
  if (!db) return null

  const [ws] = await db.select().from(workspaces).where(eq(workspaces.userId, userId)).limit(1)
  const memoRows = await db.select().from(memos).where(eq(memos.userId, userId)).orderBy(desc(memos.savedAt)).limit(50)
  const editRows = await db.select().from(edits).where(eq(edits.userId, userId)).orderBy(desc(edits.editedAt)).limit(500)

  return {
    fundsStore: ws?.fundsStore ?? null,
    memos: memoRows.map(r => r.entry),
    edits: editRows.map(r => r.entry),
    updatedAt: ws?.updatedAt?.toISOString?.() ?? null,
  }
}

export async function saveWorkspace(userId, { fundsStore, memos: memoList, edits: editList }) {
  const db = getDb()
  if (!db) return false

  await db
    .insert(workspaces)
    .values({ userId, fundsStore, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: workspaces.userId,
      set: { fundsStore, updatedAt: new Date() },
    })

  if (Array.isArray(memoList)) {
    for (const entry of memoList.slice(0, 50)) {
      if (!entry?.id) continue
      await db
        .insert(memos)
        .values({ id: entry.id, userId, entry, savedAt: new Date(entry.savedAt || Date.now()) })
        .onConflictDoUpdate({
          target: memos.id,
          set: { entry, savedAt: new Date(entry.savedAt || Date.now()) },
        })
    }
  }

  if (Array.isArray(editList)) {
    for (const entry of editList.slice(0, 500)) {
      if (!entry?.id) continue
      await db
        .insert(edits)
        .values({ id: entry.id, userId, entry, editedAt: new Date(entry.editedAt || Date.now()) })
        .onConflictDoUpdate({
          target: edits.id,
          set: { entry, editedAt: new Date(entry.editedAt || Date.now()) },
        })
    }
  }

  return true
}

export async function upsertMemo(userId, entry) {
  const db = getDb()
  if (!db || !entry?.id) return false
  await db
    .insert(memos)
    .values({ id: entry.id, userId, entry, savedAt: new Date(entry.savedAt || Date.now()) })
    .onConflictDoUpdate({
      target: memos.id,
      set: { entry, savedAt: new Date(entry.savedAt || Date.now()) },
    })
  return true
}

export async function upsertEdit(userId, entry) {
  const db = getDb()
  if (!db || !entry?.id) return false
  await db
    .insert(edits)
    .values({ id: entry.id, userId, entry, editedAt: new Date(entry.editedAt || Date.now()) })
    .onConflictDoUpdate({
      target: edits.id,
      set: { entry, editedAt: new Date(entry.editedAt || Date.now()) },
    })
  return true
}

export async function createShareDb({ id, userId, memoData, meta, teamId, expiresAt }) {
  const db = getDb()
  if (!db) return false
  await db.insert(shares).values({
    id,
    userId: userId || null,
    teamId: teamId || null,
    memoData,
    meta,
    expiresAt,
    createdAt: new Date(),
  })
  return true
}

export async function getShareDb(id) {
  const db = getDb()
  if (!db) return null
  const [row] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.id, id), gt(shares.expiresAt, new Date())))
    .limit(1)
  if (!row) return null
  return {
    memoData: row.memoData,
    meta: row.meta,
    userId: row.userId,
    createdAt: row.createdAt?.toISOString?.(),
  }
}

export async function updateShareOutcomeDb(id, { outcome, reviewerName, note }) {
  const db = getDb()
  if (!db) return null
  const [row] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.id, id), gt(shares.expiresAt, new Date())))
    .limit(1)
  if (!row) return null

  const meta = {
    ...row.meta,
    outcome,
    reviewerName: reviewerName || null,
    outcomeNote: note || null,
    outcomeAt: new Date().toISOString(),
  }

  await db.update(shares).set({ meta }).where(eq(shares.id, id))

  if (row.userId && row.meta?.memoId) {
    const entry = {
      id: `${row.meta.memoId}_share_outcome_${Date.now()}`,
      memoId: row.meta.memoId,
      companyName: row.meta.companyName || row.memoData?.COMPANY_NAME,
      fundName: row.meta.fundName,
      trackingId: 'guest',
      fieldName: '_outcome',
      originalValue: null,
      newValue: outcome,
      source: 'share',
      shareId: id,
      reviewerName: reviewerName || null,
      note: note || null,
      editedAt: new Date().toISOString(),
      section: 'outcome',
      isThesisEdit: false,
      delta: 0,
    }
    await upsertEdit(row.userId, entry)
  }

  return { memoData: row.memoData, meta }
}

export async function listTeamSharesDb(teamId) {
  const db = getDb()
  if (!db) return []
  const rows = await db
    .select()
    .from(shares)
    .where(and(eq(shares.teamId, teamId), gt(shares.expiresAt, new Date())))
    .orderBy(desc(shares.createdAt))
    .limit(200)
  return rows.map(r => ({
    id: r.id,
    companyName: r.meta?.companyName,
    fundName: r.meta?.fundName,
    outcome: r.meta?.outcome,
    allowOutcome: r.meta?.allowOutcome,
    reviewerName: r.meta?.reviewerName,
    outcomeAt: r.meta?.outcomeAt,
    createdAt: r.createdAt?.toISOString?.(),
  }))
}

export async function createTeamDb({ teamId, name, inviteCode, ownerId }) {
  const db = getDb()
  if (!db) return null
  await db.insert(teams).values({
    id: teamId,
    name,
    inviteCode,
    ownerId,
    createdAt: new Date(),
  })
  await db.insert(teamMembers).values({
    teamId,
    userId: ownerId,
    joinedAt: new Date(),
  })
  return { teamId, name, inviteCode }
}

export async function joinTeamDb(inviteCode, userId, memberName) {
  const db = getDb()
  if (!db) return null
  const code = inviteCode?.trim().toLowerCase()
  const [team] = await db.select().from(teams).where(eq(teams.inviteCode, code)).limit(1)
  if (!team) return null
  await db
    .insert(teamMembers)
    .values({ teamId: team.id, userId, memberName: memberName || null, joinedAt: new Date() })
    .onConflictDoNothing()
  return { teamId: team.id, name: team.name, inviteCode: team.inviteCode }
}

export async function getTeamDb(teamId) {
  const db = getDb()
  if (!db) return null
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1)
  return team || null
}

export { isDbEnabled }
