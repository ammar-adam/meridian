# Panache Sprint — Honest Completion Status

This documents what was **actually** delivered vs. what the sprint spec implied. The prior "done" summary overstated manual verification and understated sourcing gaps.

## What was genuinely shipped

| Item | Status | Notes |
|------|--------|-------|
| Outreach generator | **Works** | API tested live; memo UI wired; edits logged as `outreach` |
| Multi-fund profiles | **Partial** | Extended existing system; seeds only on empty localStorage |
| Template variants | **Shipped** | `default` + `compact`; selector on fund setup |
| EverTrace | **Research only** | `docs/evertrace-research.md` + placeholder module |
| Thesis mandate bug | **Fixed** | Was showing guest context |
| Fund switcher | **Fixed** | Always shows + Add fund |

## What was NOT actually done (Part 1 acceptance)

The sprint required **manual route testing** with real URLs and incognito share flows. What we did instead:

- `npm run smoke` (health, scrape latency, batch) — 3 HTTP checks
- Code review + `npm run build` + unit tests
- **No** end-to-end `/brief` on nationgraph.com timed to 90s
- **No** share link incognito Pursue → library sync verification
- **No** systematic console-error pass on every route in a browser

`BUGS.md` "Routes verified" was **overstated**. Treat Part 1 as **audit started, not acceptance-complete**.

## The big gap: Discover sourcing

**StartupHub is not enough** — especially for Panache:

| Source | What it is | Canadian / stealth fit |
|--------|------------|------------------------|
| StartupHub | "New AI startups" feed | US/global AI bias; no geography API filter; post-announcement |
| PitchBook | Optional enterprise API | Thin Canadian pre-seed; most funds don't have API |
| Perplexity | Web research (1 query) | Better, but single pass missed Canada-specific + stealth angles |
| EverTrace | Stealth signals | Scaffold only — not wired |

Panache's actual problem — **stealth founder discovery before public launch** — is structurally unserved by StartupHub + one Perplexity call.

## What we are building next (in this follow-up)

1. **Multi-pass Discover research** — Canadian-specific + stealth-oriented Perplexity passes when fund mandate includes Canada
2. **Geography-aware seed filtering** — drop obvious US-only rows when mandate is Canada-only; bias StartupHub queries toward Canadian keywords
3. **Source labeling in UI** — `stealth_signal`, `canadian_web`, `evertrace` with "Stealth — unverified" badge
4. **Honest Discover meta** — show which passes ran and warn when Canadian coverage is thin

## Still out of scope (needs separate sprint)

- Full EverTrace paid integration (demo + API key required)
- Canadian corporate registry direct data access
- Manual acceptance test script for all routes
- Auth/team sync for fund profiles
- Drag-and-drop template editor

## Memo pipeline notes (post-validation cleanup)

- **Funding confidence non-determinism:** Perplexity funding passes can return `found` on one run and `not_found` on another for the same company (e.g. hypermode.com). Confidence enforcement behaves correctly in both cases — `Undisclosed` when `not_found`, values shown when `found`. This is research variance, not a regression in enforcement logic.

## How to verify the outreach + fund work manually

1. Clear localStorage → reload → confirm Sagard + Panache seeds
2. Switch funds → brief same URL → compare thesis band
3. Pursue memo → Draft outreach → generate → edit → copy
4. Set Panache to `compact` template → confirm layout change

## How to verify improved Discover

1. Select **Panache Ventures** fund
2. Run Discover with a Canadian pre-seed thesis
3. Confirm meta shows `canadian_web` + `stealth_signal` passes
4. Confirm results include Canadian geographies and stealth-tagged rows where applicable
