import { entityId } from '@/lib/sourcing/entity-schema'

/**
 * Event host tracking — manually curated only.
 *
 * Luma has no official public discovery API for third parties. The paid
 * public-api.luma.com is organizer-scoped (Luma Plus). Unofficial
 * api.luma.com / api2.luma.com discover endpoints exist but are reverse-
 * engineered internal APIs — same risk class as scraping (ToS / block risk).
 * Per sprint scope: do NOT automate those. Maintain a small host list instead.
 *
 * Seed hosts are known Waterloo / Toronto tech community organizers from
 * public event branding (not scraped attendee lists).
 */
export const EVENT_HOST_SEED = [
  {
    hostName: 'Waterloo Tech Week',
    affiliatedCompany: 'Waterloo Tech Week',
    eventSeries: 'Waterloo Tech Week',
    category: 'startup / tech',
    geography: 'Canada · Waterloo',
  },
  {
    hostName: 'Hack the North',
    affiliatedCompany: 'Hack the North',
    eventSeries: 'Hack the North',
    category: 'hackathon',
    geography: 'Canada · Waterloo',
  },
  {
    hostName: 'Velocity Incubator',
    affiliatedCompany: 'Velocity',
    eventSeries: 'Velocity community events',
    category: 'incubator',
    geography: 'Canada · Waterloo',
  },
]

export function runEventHostAdapter({ hostSource = EVENT_HOST_SEED } = {}) {
  return hostSource.map(entry => ({
    id: entityId('event_host', entry.hostName),
    type: 'person',
    personName: entry.hostName,
    companyName: entry.affiliatedCompany || null,
    domain: null,
    source: 'event_host',
    confidence: 'medium',
    provenance: `Hosts ${entry.eventSeries} (${entry.category})`,
    sourceMeta: {
      ...entry,
      stage: 'n/a',
      sector: entry.category || '',
      geography: entry.geography || 'Canada',
    },
    discoveredAt: new Date().toISOString(),
  }))
}
