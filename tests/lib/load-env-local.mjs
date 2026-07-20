import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Repo root from any tests/** file (tests/lib → ../../) */
export function repoRootFrom(importMetaUrl) {
  return path.dirname(path.dirname(path.dirname(fileURLToPath(importMetaUrl))))
}

/** Load .env.local if present — no-op in CI where the file is absent. */
export function loadEnvLocal(root = process.cwd()) {
  const filePath = path.join(root, '.env.local')
  if (!fs.existsSync(filePath)) return false
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
  return true
}
