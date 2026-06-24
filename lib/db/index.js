import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/lib/db/schema'

let _db = null

export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getDb() {
  if (!isDbEnabled()) return null
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL)
    _db = drizzle(sql, { schema })
  }
  return _db
}

export { schema }
