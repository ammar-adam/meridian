/**
 * Run: npm run db:migrate
 * Applies drizzle/*.sql migrations in order.
 */
import { readFileSync, existsSync, readdirSync } from 'fs'
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
const dir = resolve(process.cwd(), 'drizzle')
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

for (const file of files) {
  const migration = readFileSync(resolve(dir, file), 'utf8')
  for (const statement of migration.split(';').map(s => s.trim()).filter(Boolean)) {
    await sql.query(statement)
  }
  console.log(`applied ${file}`)
}

console.log('migrations complete')
