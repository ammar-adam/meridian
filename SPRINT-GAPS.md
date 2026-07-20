# Panache Sprint — Honest Completion Status

## Strategic context

Read before any data-sourcing work:

- [docs/meridian-vision.md](docs/meridian-vision.md) — Reframe 4: community-access data is the moat
- [docs/data-sourcing-wedge-vision.md](docs/data-sourcing-wedge-vision.md) — Waterloo → Ontario → national entry sequence

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
- Live Corporations Canada ingest in every Discover request at national scale (adapter exists; keep keyword-capped)
- Automated Luma discover API (explicitly declined — see docs/event-host-sources.md)
- Manual acceptance test script for all routes
- Auth/team sync for fund profiles
- Drag-and-drop template editor

## Multi-source data layer (this sprint)

| Adapter | Status | Evidence |
|---------|--------|----------|
| Domain registry | **Works** | Corporations Canada CSV + DNS; see `scripts/verify-domain-registry.mjs` |
| Velocity incubator | **Works** | May 2026 cohort populated in `lib/sourcing/incubator-adapter.js` |
| IRAP grants | **Works** | Public NRC CSV exists; curated seed in `lib/sourcing/grant-adapter.js` |
| Event hosts | **Curated only** | No safe Luma API; manual Waterloo hosts — `docs/event-host-sources.md` |
| Entity resolver | **Works** | Perplexity person↔company; honest failures left partial |
| Discover provenance UI | **Shipped** | Source badges + provenance line in `source-table.jsx` |

Strategic docs: [docs/meridian-vision.md](docs/meridian-vision.md), [docs/data-sourcing-wedge-vision.md](docs/data-sourcing-wedge-vision.md)

## Data Layer Improvement Sprint — running log

| When | Part | Note |
|------|------|------|
| start | 0 | Falsifiable baseline: SCADABLE, Simantic, Photon-IV vs Perplexity + StartupHub |
| done | 0 | **3/3 pass** — Meridian has founders+description; Perplexity surfaces name but not founders; StartupHub no hits (Photon-IV hub rate-limited to 0). See `docs/falsifiable-test-results.md` |
| done | 1 | Registry probe: baseline 25→3 (12%); after prioritize+parallel+cache: 100→18 (18%), 250→39 (15.6%), 500→73 (14.6%) all &lt;8s wall. Default Discover limit set to **250**. Yield rate ~15–18% — most keyword matches genuinely lack live guessed domains |
| done | 2 | DMZ Fall’25+Spring’26 populated (18); CDL AI 2025/26 (5); Communitech + MaRS documented **not viable** (job board / gated Connect) |
| done | 3 | Velocity expanded: May’26 (8) + Feb’26 (13) + Pitch’25 (5) = **26** Velocity rows |
| done | 4 | Accuracy sample n=13: 3 accurate / 5 inaccurate / 5 inconclusive. Registry noise + Perplexity false-negatives on Velocity; mitigations: non-startup name filter; skip resolver on registry |
| done | build | `npm run build` after changes |
| done | enrich | Velocity/DMZ founder+domain pass + CDL Cancer/Neuro; 66 entities, 25 founders / 25 domains / 18 fully enriched (was 1) |
| done | demo | Discover prefers fully-enriched incubator seeds; registry noise filters expanded; mentor thesis preset + fallback briefs; falsifiable 3/3 under StartupHub-blind criterion |

**Incubator totals:** velocity 26 + dmz 18 + cdl 22 = **66** entities; 3/5 source keys populated (communitech/mars empty by design).

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
