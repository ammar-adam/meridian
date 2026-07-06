# Meridian Bug Audit — Panache Sprint

Audit date: 2026-07-03. Smoke tests (`npm run smoke` against localhost) and code review across all routes.

## [/thesis] — Stated mandate shows guest context instead of active fund
**Severity:** major
**Repro:** Configure a fund profile with a custom thesis → generate briefs → open `/thesis` with pursue/pass data → scroll to "Revealed preference" card
**Expected:** "Stated mandate" reflects the active fund's thesis
**Actual:** Always displayed `GUEST_FUND_API_CONTEXT.thesis` regardless of active fund
**Fix:** Load active fund thesis via `getFundProfile()` / `getActiveStrategy()` and display that text — **fixed in `app/thesis/page.jsx`**

## [/fund] — Fund switcher hidden when only one fund exists
**Severity:** minor
**Repro:** Set up a single fund profile → open any workspace route
**Expected:** Fund switcher visible with option to add another fund (per multi-fund UX)
**Actual:** `FundSwitcher` returned `null` when `funds.length <= 1`
**Fix:** Always show switcher with "+ Add fund" link to `/fund/setup` — **fixed in `components/context-switcher.jsx`**

## [memo-template] — Hardcoded "Sagard" comment in template CSS
**Severity:** minor
**Repro:** Open `public/memo-template.html` or rendered memo source
**Expected:** No fund-specific branding in runtime templates
**Actual:** CSS comment `/* THESIS FIT (THE SAGARD ANGLE) */` in template
**Fix:** Deferred — comment only, no runtime impact; cleaned in `public/templates/default.html`

## [/share/[id]] — Share outcome sync depends on DATABASE_URL
**Severity:** minor
**Repro:** Use share links without `DATABASE_URL` configured
**Expected:** Share links work (per acceptance test)
**Actual:** Share links disabled when database off; documented in UI ("Share links need DATABASE_URL")
**Fix:** Deferred — infrastructure requirement, not a code bug; health panel shows `shareLinks: off`

## Routes — smoke/code review only (NOT full manual acceptance)
See `SPRINT-GAPS.md` for honest sprint status.

- `/brief` — scrape API <8s on smoke test; pipeline wired to `/api/brief` + `/api/generate`
- `/memo` — inline edit, pursue/pass, share/copy, PDF fallback
- `/discover` — source API returns ranked companies when keys configured
- `/library` — filtering, GP outcome poller active via `GpOutcomePoller`
- `/thesis` — empty state safe with 0 memos; metrics render with sparse data
- `/fund/setup` — auto-enrich flow intact
- `npm run build` — passes
- `npm run test:unit` — 51 tests pass
