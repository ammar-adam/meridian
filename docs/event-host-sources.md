# Event host sources (Luma and community)

## Luma public data access — findings

| Path | Status | Risk |
|------|--------|------|
| Official `public-api.luma.com` | Organizer-scoped; requires Luma Plus | Not useful for discovery |
| Unofficial `api.luma.com` / `api2.luma.com` discover endpoints | Documented by third parties as reverse-engineered | **Same class as scraping** — ToS / block risk |
| Attendee lists | Explicitly out of scope | Account-risk pattern (Panache LinkedIn precedent) |

**Decision this sprint:** do **not** call Luma’s internal discover APIs. Ship a manually curated host list only.

## What Meridian ships

`lib/sourcing/event-host-adapter.js` → `EVENT_HOST_SEED` with known Waterloo-ecosystem event brands (Waterloo Tech Week, Hack the North, Velocity community events). These are **hosts / organizers**, not attendees. Confidence: medium. Type: person (org brand as host name) with optional affiliated company.

## Refresh plan

1. When a new recurring series becomes relevant (e.g. a Toronto fintech meetup you personally know), add one row to `EVENT_HOST_SEED`.
2. Never automate attendee export or Luma calendar scraping.
3. Revisit only if Luma publishes an official, documented, redistributable discovery API.

## Viability

**Partially viable** as a curated signal for Waterloo Phase 1. **Not viable** as an automated Luma pipeline under current public-API constraints and sprint risk rules.
