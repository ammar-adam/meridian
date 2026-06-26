import crypto from 'crypto'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { getDb, isDbEnabled, schema } from '@/lib/db'

const { batchJobs } = schema
const LOCAL_KEY = 'meridian_batch_job'

function serializeJob(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    researchMode: row.researchMode,
    urls: row.urls,
    results: row.results || [],
    progress: row.progress || {},
    sourceContext: row.sourceContext || null,
    createdAt: row.createdAt?.toISOString?.(),
    updatedAt: row.updatedAt?.toISOString?.(),
  }
}

export function saveLocalBatchJob(job) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_KEY, JSON.stringify(job))
}

export function loadLocalBatchJob() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearLocalBatchJob() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOCAL_KEY)
}

export async function createBatchJobDb({ userId, urls, researchMode, sourceContext }) {
  const db = getDb()
  if (!db) return null

  const id = crypto.randomBytes(8).toString('base64url')
  const now = new Date()
  const job = {
    id,
    userId: userId || 'guest',
    status: 'queued',
    researchMode: researchMode || 'quick',
    urls,
    results: urls.map(url => ({ url, status: 'pending' })),
    progress: { completed: 0, failed: 0, skipped: 0, total: urls.length, current: null },
    sourceContext: sourceContext || null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(batchJobs).values(job)
  return serializeJob(job)
}

export async function getBatchJobDb(id, userId) {
  const db = getDb()
  if (!db) return null
  const [row] = await db
    .select()
    .from(batchJobs)
    .where(and(eq(batchJobs.id, id), eq(batchJobs.userId, userId || 'guest')))
    .limit(1)
  return serializeJob(row)
}

export async function getActiveBatchJobDb(userId) {
  const db = getDb()
  if (!db) return null
  const uid = userId || 'guest'
  const [row] = await db
    .select()
    .from(batchJobs)
    .where(and(eq(batchJobs.userId, uid), inArray(batchJobs.status, ['running', 'queued'])))
    .orderBy(desc(batchJobs.updatedAt))
    .limit(1)
  return serializeJob(row)
}

export async function listRunningBatchJobsDb(limit = 5) {
  const db = getDb()
  if (!db) return []
  const rows = await db
    .select()
    .from(batchJobs)
    .where(eq(batchJobs.status, 'running'))
    .orderBy(desc(batchJobs.updatedAt))
    .limit(limit)
  return rows.map(serializeJob)
}

export async function updateBatchJobDb(id, userId, patch) {
  const db = getDb()
  if (!db) return null

  const existing = await getBatchJobDb(id, userId)
  if (!existing) return null

  const next = {
    ...existing,
    ...patch,
    updatedAt: new Date(),
  }

  await db
    .update(batchJobs)
    .set({
      status: next.status,
      results: next.results,
      progress: next.progress,
      researchMode: next.researchMode,
      updatedAt: new Date(),
    })
    .where(and(eq(batchJobs.id, id), eq(batchJobs.userId, userId || 'guest')))

  return serializeJob({ ...next, updatedAt: new Date() })
}

export function isBatchDbEnabled() {
  return isDbEnabled()
}
