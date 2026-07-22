/**
 * Watch events — detect strong_match, verified_miss, new_since_last_visit, serial_founder.
 */

/** Classify watch-relevant events from annotated Flow companies. */
export function detectWatchEvents(companies = [], { sinceIso = null } = {}) {
  const events = []
  const since = sinceIso ? Date.parse(sinceIso) : null

  for (const c of companies || []) {
    const base = {
      company: c.name,
      domain: c.domain || null,
      fitScore: c.fitScore ?? null,
      source: c.source || null,
    }

    if (c.isNew) {
      events.push({
        type: 'new_since_last_visit',
        ...base,
        detail: 'Not in last-seen snapshot',
      })
    } else if (since && c.meridianFirstSeen) {
      const t = Date.parse(c.meridianFirstSeen)
      if (!Number.isNaN(t) && t > since) {
        events.push({
          type: 'new_since_last_visit',
          ...base,
          detail: `First observed ${String(c.meridianFirstSeen).slice(0, 10)}`,
        })
      }
    }

    if (c.ledger?.verification?.status === 'verified_miss'
      || c.coverage?.status === 'community_first') {
      events.push({
        type: 'verified_miss',
        ...base,
        detail: c.coverage?.label || c.ledger?.verification?.label || 'Index miss on record',
      })
    }

    if ((c.fitScore || 0) >= 80) {
      events.push({
        type: 'strong_match',
        ...base,
        detail: `Fit ${c.fitScore}`,
      })
    }

    if (c.serialFounder) {
      events.push({
        type: 'serial_founder',
        ...base,
        detail: c.priorCompanies?.length
          ? `Prior: ${c.priorCompanies.slice(0, 3).join(', ')}`
          : 'Serial founder flag',
      })
    }
  }

  return events
}

/** Dedupe events by type+company key. */
export function dedupeWatchEvents(events = []) {
  const seen = new Set()
  const out = []
  for (const e of events) {
    const key = `${e.type}:${(e.domain || e.company || '').toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}
