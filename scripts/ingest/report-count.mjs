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
const failBelow = process.argv.includes('--fail-below-target')
const n = await countCompanies()
const targetMet = (n ?? 0) >= target
const summary = {
  companyRecords: n,
  target,
  targetMet,
  ok: n != null,
  // Progressive corpus fill — below target is status, not failure (unless --fail-below-target).
  hint: targetMet
    ? 'Target met'
    : 'Below target — next scheduled run continues school-ecosystem fill',
}
console.log(JSON.stringify(summary))
if (n == null) process.exit(2)
process.exit(failBelow && !targetMet ? 1 : 0)
