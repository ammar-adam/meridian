import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countCompanies } from '@/lib/server/company-records'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
for (const name of ['.env.local', '.env']) {
  const envPath = resolve(root, name)
  if (!existsSync(envPath)) continue
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

const target = Number(process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || '1500')
const n = await countCompanies()
console.log(JSON.stringify({ companyRecords: n, target, ok: (n ?? 0) >= target }))
process.exit((n ?? 0) >= target ? 0 : 1)
