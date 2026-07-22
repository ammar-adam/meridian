import crypto from 'node:crypto'
import { upsertSourceCheck, listSourceWatches } from '@/lib/server/truth-ledger'

/**
 * Community source watchers — automated DETECTION of new cohort content.
 * Extraction stays curated (we never auto-invent founders/domains).
 */

export const WATCHED_SOURCES = [
  { label: 'Velocity — news / cohort announcements', url: 'https://www.velocityincubator.com/news' },
  { label: 'DMZ — startup directory', url: 'https://dmz.torontomu.ca/startup-directory' },
  { label: 'DMZ — posts', url: 'https://dmz.torontomu.ca/blog' },
]

/** Visible-text content hash — shared by source-watch and the ingestion worker. */
export function visibleTextHash(html) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
  return crypto.createHash('sha256').update(text).digest('hex')
}

export async function checkSource({ url, label }) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MeridianSourceWatch/1.0 (+cohort freshness check)' },
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
      cache: 'no-store',
    })
    if (!res.ok) return { url, label, ok: false, status: res.status }
    const hash = visibleTextHash(await res.text())
    const { changed } = await upsertSourceCheck({ url, label, hash })
    return { url, label, ok: true, changed }
  } catch (e) {
    return { url, label, ok: false, error: e.message }
  }
}

export async function checkAllSources() {
  const results = []
  for (const source of WATCHED_SOURCES) {
    results.push(await checkSource(source))
  }
  return results
}

/** Run watchers only if the oldest check is stale — safe on public routes. */
export async function checkSourcesIfStale(maxAgeHours = 24) {
  const watches = await listSourceWatches()
  const cutoff = Date.now() - maxAgeHours * 3600000
  const missing = WATCHED_SOURCES.some(s => !watches.find(w => w.url === s.url))
  const stale = watches.some(w => new Date(w.last_checked_at).getTime() < cutoff)
  if (!missing && !stale) return { ran: false }
  return { ran: true, results: await checkAllSources() }
}
