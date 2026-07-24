/**
 * Lightweight job log for research / school scout / emerging / coverage.
 * Infra only — not marketed as an "agent platform."
 */

import { neon } from '@neondatabase/serverless'

const memory = []
const MAX_MEMORY = 200

let _sql = null
let _ensured = false

function sqlClient() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return null
  if (!_sql) _sql = neon(url, { fetchOptions: { cache: 'no-store' } })
  return _sql
}

async function ensure(sql) {
  if (_ensured) return
  await sql`CREATE TABLE IF NOT EXISTS agent_jobs (
    id text PRIMARY KEY,
    type text NOT NULL,
    status text NOT NULL,
    trigger text,
    summary text,
    meta jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
  )`
  await sql`CREATE INDEX IF NOT EXISTS agent_jobs_created_idx ON agent_jobs (created_at DESC)`
  _ensured = true
}

function id() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function startJob({ type, trigger = '', meta = {} } = {}) {
  const job = {
    id: id(),
    type: type || 'unknown',
    status: 'running',
    trigger,
    summary: null,
    meta,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  }
  memory.unshift(job)
  if (memory.length > MAX_MEMORY) memory.pop()

  const sql = sqlClient()
  if (sql) {
    try {
      await ensure(sql)
      await sql`INSERT INTO agent_jobs (id, type, status, trigger, meta, created_at)
        VALUES (${job.id}, ${job.type}, ${job.status}, ${job.trigger},
                ${JSON.stringify(meta)}, ${job.createdAt})`
    } catch (e) {
      console.error('[agent-jobs] start:', e.message)
    }
  }
  return job
}

export async function finishJob(jobId, { status = 'done', summary = '', meta = {} } = {}) {
  const finishedAt = new Date().toISOString()
  const idx = memory.findIndex(j => j.id === jobId)
  if (idx >= 0) {
    memory[idx] = {
      ...memory[idx],
      status,
      summary,
      meta: { ...(memory[idx].meta || {}), ...meta },
      finishedAt,
    }
  }

  const sql = sqlClient()
  if (sql) {
    try {
      await ensure(sql)
      await sql`UPDATE agent_jobs SET status = ${status}, summary = ${summary},
        meta = COALESCE(meta, '{}'::jsonb) || ${JSON.stringify(meta)}::jsonb,
        finished_at = ${finishedAt} WHERE id = ${jobId}`
    } catch (e) {
      console.error('[agent-jobs] finish:', e.message)
    }
  }
  return idx >= 0 ? memory[idx] : { id: jobId, status, summary, finishedAt }
}

export async function listJobs({ limit = 40 } = {}) {
  const sql = sqlClient()
  if (sql) {
    try {
      await ensure(sql)
      const rows = await sql`SELECT id, type, status, trigger, summary, meta, created_at, finished_at
        FROM agent_jobs ORDER BY created_at DESC LIMIT ${limit}`
      if (rows?.length) {
        return rows.map(r => ({
          id: r.id,
          type: r.type,
          status: r.status,
          trigger: r.trigger,
          summary: r.summary,
          meta: r.meta,
          createdAt: r.created_at,
          finishedAt: r.finished_at,
        }))
      }
    } catch (e) {
      console.error('[agent-jobs] list:', e.message)
    }
  }
  return memory.slice(0, limit)
}
