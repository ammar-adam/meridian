import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const MEMORY = new Map()
const CACHE_DIR = path.join(process.cwd(), '.cache', 'meridian')
let dirReady = false

export const CACHE_TTL = {
  scrape: 24 * 60 * 60 * 1000,
  research: 7 * 24 * 60 * 60 * 1000,
  generate: 7 * 24 * 60 * 60 * 1000,
  source: 24 * 60 * 60 * 1000,
  fundEnrich: 30 * 24 * 60 * 60 * 1000,
}

export function stableHash(value) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function safeFileName(key) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function filePath(key) {
  return path.join(CACHE_DIR, `${safeFileName(key)}.json`)
}

async function ensureDir() {
  if (dirReady) return
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    dirReady = true
  } catch {
    // read-only filesystem (e.g. some serverless) — memory-only cache
  }
}

export async function cacheGet(key) {
  const mem = MEMORY.get(key)
  if (mem) {
    if (mem.expiresAt > Date.now()) return mem.value
    MEMORY.delete(key)
  }

  try {
    await ensureDir()
    const raw = await fs.readFile(filePath(key), 'utf8')
    const entry = JSON.parse(raw)
    if (entry.expiresAt <= Date.now()) {
      await fs.unlink(filePath(key)).catch(() => {})
      return null
    }
    MEMORY.set(key, entry)
    return entry.value
  } catch {
    return null
  }
}

export async function cacheSet(key, value, ttlMs) {
  const entry = { value, expiresAt: Date.now() + ttlMs }
  MEMORY.set(key, entry)
  try {
    await ensureDir()
    await fs.writeFile(filePath(key), JSON.stringify(entry))
  } catch {
    // memory-only fallback
  }
}
