import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CBCA_URL = 'https://d4bf66bykfyaf.cloudfront.net/corporations-active-cbca-en.csv'
const NON_CBCA_URL = 'https://d4bf66bykfyaf.cloudfront.net/corporations-active-non-cbca-en.csv'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_ROWS_SCAN = 80_000

function cacheDir() {
  const dir = path.join(process.cwd(), '.cache', 'canada-registry')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function cachePath(name) {
  return path.join(cacheDir(), name)
}

async function fetchCsv(url, filename) {
  const dest = cachePath(filename)
  try {
    const st = fs.statSync(dest)
    if (Date.now() - st.mtimeMs < CACHE_TTL_MS && st.size > 1000) {
      return fs.readFileSync(dest, 'utf8')
    }
  } catch { /* miss */ }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'MeridianSourcing/1.0 (research; contact: local-dev)' },
  })
  if (!res.ok) throw new Error(`Canada registry fetch failed (${res.status}): ${url}`)
  const text = await res.text()
  fs.writeFileSync(dest, text, 'utf8')
  return text
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function detectColumns(headerCells) {
  const lower = headerCells.map(h => h.toLowerCase())
  const find = (...needles) => lower.findIndex(h => needles.some(n => h.includes(n)))
  return {
    name: find('corporation name', 'company name', 'legal name', 'name'),
    number: find('corporation number', 'corp number', 'business number', 'number'),
    date: find('incorporation date', 'date of incorporation', 'creation date', 'status date', 'date'),
    province: find('province', 'jurisdiction', 'home jurisdiction'),
  }
}

function parseDate(raw) {
  if (!raw) return null
  const cleaned = raw.replace(/\//g, '-').trim()
  const d = new Date(cleaned)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/**
 * Fetch + cache federal Corporations Canada active CSV snapshots.
 * @returns {Promise<{ rows: object[], source: string }>}
 */
export async function fetchFederalRegistrySnapshot() {
  const [cbca, nonCbca] = await Promise.all([
    fetchCsv(CBCA_URL, 'corporations-active-cbca-en.csv').catch(err => {
      console.warn('[canada-registry] CBCA fetch failed:', err.message)
      return ''
    }),
    fetchCsv(NON_CBCA_URL, 'corporations-active-non-cbca-en.csv').catch(err => {
      console.warn('[canada-registry] non-CBCA fetch failed:', err.message)
      return ''
    }),
  ])

  const rows = []
  for (const [label, text] of [['cbca', cbca], ['non-cbca', nonCbca]]) {
    if (!text) continue
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) continue
    const header = parseCsvLine(lines[0])
    const cols = detectColumns(header)
    if (cols.name < 0) {
      console.warn('[canada-registry] could not detect name column in', label, header.slice(0, 8))
      continue
    }

    const limit = Math.min(lines.length - 1, MAX_ROWS_SCAN)
    for (let i = 1; i <= limit; i++) {
      const cells = parseCsvLine(lines[i])
      const name = cells[cols.name]
      if (!name || name.length < 3) continue
      const incorporationDate = cols.date >= 0 ? parseDate(cells[cols.date]) : null
      rows.push({
        name: name.replace(/\s+/g, ' ').trim(),
        corporationNumber: cols.number >= 0 ? (cells[cols.number] || `${label}_${i}`) : `${label}_${i}`,
        incorporationDate: incorporationDate ? incorporationDate.toISOString().slice(0, 10) : null,
        incorporationTs: incorporationDate ? incorporationDate.getTime() : 0,
        province: cols.province >= 0 ? (cells[cols.province] || '') : '',
        registrySource: label,
      })
    }
  }

  return { rows, source: 'corporations-canada-cloudfront', fetchedAt: new Date().toISOString() }
}

/**
 * Filter recent incorporations by keywords / province.
 */
export function findRecentIncorporations(rowsOrOpts, maybeOpts) {
  const opts = Array.isArray(rowsOrOpts) ? (maybeOpts || {}) : (rowsOrOpts || {})
  const rows = Array.isArray(rowsOrOpts) ? rowsOrOpts : null

  const sinceDate = opts.sinceDate ? new Date(opts.sinceDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const sinceTs = sinceDate.getTime()
  const keywords = (opts.keywords || []).map(k => String(k).toLowerCase()).filter(Boolean)
  const province = (opts.province || '').toLowerCase()

  function filter(list) {
    return list
      .filter(r => {
        if (r.incorporationTs && r.incorporationTs < sinceTs) return false
        if (province && r.province && !r.province.toLowerCase().includes(province)) return false
        if (!keywords.length) return true
        const hay = r.name.toLowerCase()
        return keywords.some(k => hay.includes(k))
      })
      .sort((a, b) => (b.incorporationTs || 0) - (a.incorporationTs || 0))
  }

  if (rows) return filter(rows)

  // Sync path used when snapshot already loaded into module cache
  const cached = globalThis.__meridianCanadaRegistryRows
  if (!cached) return []
  return filter(cached)
}

export async function loadAndFindRecentIncorporations(opts = {}) {
  const snap = await fetchFederalRegistrySnapshot()
  globalThis.__meridianCanadaRegistryRows = snap.rows
  return {
    ...snap,
    matches: findRecentIncorporations(snap.rows, opts),
  }
}

export function registryCacheInfo() {
  try {
    return {
      dir: cacheDir(),
      tmp: os.tmpdir(),
    }
  } catch {
    return { dir: null }
  }
}
