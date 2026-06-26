/**
 * Run: node scripts/migrate-batch-jobs.mjs
 * Requires DATABASE_URL in environment (.env.local loaded via dotenv if present)
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { neon } from '@neondatabase/serverless'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(url)
const migration = readFileSync(resolve(process.cwd(), 'drizzle/0001_batch_jobs.sql'), 'utf8')

// Run each statement (Neon tagged-template API does not accept raw multi-statement strings)
for (const statement of migration.split(';').map(s => s.trim()).filter(Boolean)) {
  await sql.query(statement)
}
console.log('batch_jobs migration applied')
