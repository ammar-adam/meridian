# Build Plan — Five Slices to the Aggregate Data Platform

Derived from `docs/gap-analysis-v3.md` (15 problems / 15 ideas). Each slice is independently
shippable, has explicit file-level tasks, and states its acceptance test. Dependency chain:
**A (records) → B (ingestion) → C (proof) → D (matching) → E (trust/market)** — but A+E can
start in parallel, and C needs only A's schema, not B's volume.

Problem/idea numbers reference the gap analysis.

---

## Slice A — The Company Record (problems 4, 5, 14 · ideas 3, 6-partial)

**Goal:** one durable record per company that every surface reads and every signal writes.
This is the abstraction both v1 and v2 lacked.

### Tasks

1. **Schema** — `lib/db/schema.js` + `scripts/drizzle/0005_company_records.sql`:
   - `companies` (id = normalized name/domain key, name, domain, one_liner, geography,
     stage, sectors jsonb, first_observed_at, updated_at, meta jsonb)
   - `sightings` (id, company_id, source_id, source_type, url, observed_at, cohort_date,
     provenance, raw jsonb) — append-only; one row per time any pipeline sees the company
   - `people` (id, name, linkedin_url, email, email_status enum
     [verified|pattern|none], meta jsonb) and `company_people` (company_id, person_id, role)
   - `funding_events` (id, company_id, kind [form_d|sedar|announced|grant], amount, date,
     investors jsonb, source_url)
2. **Record store module** — `lib/server/company-records.js`: `upsertCompany`,
   `recordSighting`, `mergeSignals` (dedupe by domain, then normalized name),
   `getRecord`, `listRecords({filters})`, `newSince(actorId|fundId, ts)`. Reuse the
   `cache:'no-store'` Neon client from `lib/server/truth-ledger.js`.
3. **Backfill** — `scripts/backfill-company-records.mjs`: migrate the 72 ledger entities +
   incubator/grant/event corpora into `companies` + `sightings` (provenance preserved,
   first_observed_at carried over from ledger — never reset).
4. **Ledger integration** — `lib/server/truth-ledger.js`: index checks and outcomes key on
   company_id; keep `ledger_entities` as a view/alias during migration, delete after.
5. **Brief warm-start** — `app/api/brief/route.js`: before scraping, look up the company
   record; inject known founders/funding/sightings into the memo pipeline context and skip
   redundant passes. Research results write back to the record (idea 3's compounding).
6. **Server-side watches** — `watches` table (actor_id, fund_name, thesis, created_at,
   last_digest_at); `app/api/watches/route.js` CRUD; `lib/mandate-watch.js` syncs
   localStorage → server when available (GAPS item 4).

**Acceptance:** `/api/brief` for a known company starts with record context (<5s to first
content); a second brief on the same company reuses stored research; `newSince` returns
correct rows; all 103+ tests pass.

---

## Slice B — The Ingestion Machine (problems 1, 2, 3, 6, 13 · ideas 1, 2, 4, 5, 6)

**Goal:** hundreds of sources, zero hand-typing, runs daily without a laptop.

### Tasks

1. **Source registry** — `sources` table (id, label, url, type
   [university|incubator|accelerator|launch|capital|registry], cadence [daily|weekly],
   geography, active, last_run_at, last_hash) + seed file
   `lib/sourcing/source-seeds.json` with the top ~200 NA university entrepreneurship/
   incubator news pages and top ~200 accelerators (research task: compile the list with
   URLs — one subagent, output reviewed before commit).
2. **LLM extraction worker** — `scripts/ingest/run-ingestion.mjs` + `lib/server/extractor.js`:
   fetch page → readability-strip to text (reuse `lib/scrape` internals) → Claude Haiku
   with a strict JSON schema (companies: name, domain?, founders?, program, cohort_date?,
   evidence_quote) → validate → `recordSighting` per hit. Idempotent via content hash
   (reuse `visibleTextHash` from `lib/server/source-watch.js`). Confidence rules: no
   domain ⇒ candidate status, never "community_first".
3. **Scheduler** — `.github/workflows/ingest.yml`: cron daily (hot sources) + weekly (long
   tail); needs `DATABASE_URL`, `ANTHROPIC_API_KEY` as GH secrets; writes a run summary
   to `ingestion_runs` table (started, sources_checked, new_companies, errors) so runs are
   auditable in-product.
4. **Signal adapters** (each writes sightings, each cadence-scheduled):
   - `lib/sourcing/product-hunt-adapter.js` — PH GraphQL API, daily launches
   - `lib/sourcing/form-d-adapter.js` — SEC EDGAR full-text Form D daily index (free);
     extract issuer, officers, amount → `funding_events` + people
   - `lib/sourcing/sedar-adapter.js` — SEDAR+ exempt distribution filings (Canada)
   - un-gate `domain-registry-adapter` from the Canada regex (`run-adapters.js:31`) and
     schedule it instead of running at request time
5. **Scout agent (v1 engine as a feed)** — `scripts/ingest/scout-sweep.mjs`: per active
   watch, run 2–3 Perplexity Sonar queries ("companies announced/launched this week
   matching <mandate>"), parse citations into candidate sightings (source_type='scout',
   labeled as AI-researched, never "verified"). Runs nightly in the same workflow.
6. **Founder graph v0** — during extraction, upsert `people` + `company_people`; flag
   `serial_founder=true` when a person appears on 2+ companies or a scout/news pass cites
   a prior exit. Surface as a chip in Flow rows ("2x founder — prior: <name>").

**Acceptance:** GH Action runs green on schedule; a new cohort page added to `sources`
produces company records with first_observed_at timestamps nobody typed; `companies` count
>500 within the first week of runs; every sighting has provenance + evidence quote.

---

## Slice C — The Proof Engine & Honest Claims (problems 8, 9 · ideas 8, 9, 15)

**Goal:** every claim in the UI is backed by a database row, and proof accrues on schedule.

### Tasks

1. **Scheduled index checks** — add job to `.github/workflows/ingest.yml` calling
   `scripts/ingest/index-check-sweep.mjs`: full-corpus StartupHub name search (batch,
   rate-limited), write `index_checks` rows; support a pluggable second index later
   (Harmonic via pilot customer seat).
2. **Kill the hardcoded registry** — delete `INDEX_TEST_REGISTRY` from
   `lib/freshness-ledger.js`; verification status derives ONLY from `index_checks` rows
   (fetched server-side and passed to annotators). `community_first` auto-label in
   `lib/coverage-proof.js` becomes `community_sourced` unless a dated check exists.
3. **Fix reachability math** — `lib/reachability.js`: `rate` counts only verified emails +
   direct (non-search) LinkedIn URLs; search links get their own `searchOnly` count.
   Update `lib/flow-digest.js`, flow meta, and tests to match.
4. **Claims-audit CI** — `tests/unit/claims-audit.test.mjs`: walks UI copy constants and
   asserts no component renders `verified_miss`/"Not in <index>" without a check row in
   its props path; plus a lint-style scan for banned phrases ("verified", "before public
   indexes") outside receipt components. Add to `ci.yml`.
5. **Public earliness scoreboard** — `app/earliness/page.jsx` + extend `/api/benchmark`:
   per-source median (first_observed_at → index first-seen) once checks accrue; until
   then the page shows check counts and honest "accruing since <date>" copy. Public route.
6. **De-risk pilot page** — `lib/pilot-case.js` + `app/pilot/page.jsx`: replace "Panache
   Ventures (illustrative)" with "a Canadian pre-seed fund (anonymized)"; all metrics from
   live ledger only; delete `falsifiablePasses` hardcode.

**Acceptance:** `verifiedMisses` in `/api/benchmark` is >0 and grows week-over-week from
scheduled runs; grep finds zero unbacked "Not in" strings; CI fails if one is added.

---

## Slice D — Real Matching & Surfaces (problems 12, 13, 14 · ideas 11, 6-surface)

**Goal:** two different mandates produce visibly different, honestly-ranked feeds.

### Tasks

1. **Structured company facets** — extraction (Slice B) populates geography/stage/sectors
   on records; backfill facets for existing corpus via one Haiku batch script.
2. **Matching engine** — `lib/server/mandate-match.js`: hard filters (geo, stage) then
   scoring = sector/keyword overlap (embeddings via Anthropic if cheap enough, else
   token-weighted scoring) + freshness boost + serial-founder boost. Returns per-company
   `matchReasons` (renderable, honest).
3. **Kill fitScore theater** — `lib/discover-fast.js`: remove hardcoded
   `canadianMandate: true`; `/api/flow` calls mandate-match against company records; rows
   show matchReasons, never a bare number that can't be explained.
4. **Coverage banner** — `app/flow/page.jsx` + flow meta: when hard filters exclude most
   of the corpus, render "Your mandate is outside most of our current coverage (X of Y
   companies match). Coverage expanding: <top pending source geographies from `sources`>."
5. **New-since-last-visit** — flow reads `newSince(watch)` from Slice A; digest reads
   server watches; "N new" is per-account real.
6. **Latency** — `/api/flow` reads records only (no request-time adapter runs) — target
   <2s p95; move all live fetching to the scheduled workers.

**Acceptance:** "US Series B fintech" vs "Canadian pre-seed AI" return different result
sets with different match reasons; off-corpus mandate shows the coverage banner; p95 <2s.

---

## Slice E — Trust, Tenancy & Market Fit (problems 10, 11, 15 · ideas 10, 12, 13, 14)

**Goal:** an institution can sign up, trust it, and pay for it as themselves.

### Tasks

1. **Lock the writes** — `app/api/outcomes/route.js`, `app/api/claim/route.js`: rate
   limits (extend `lib/api-guard.js`), device-cookie binding, size caps; cleanup script
   to purge `DILIGENCE_TEST_*` rows.
2. **Redact `/api/health`** — public payload: `ok` + feature flags only; full config
   detail moves behind `CRON_SECRET` auth or is removed.
3. **Furniture pages** — `app/about/page.jsx`, `app/privacy/page.jsx`,
   `app/terms/page.jsx`, `app/pricing/page.jsx` (tiers: Analyst $99 / Fund $299 /
   Ecosystem $499 per seat/mo, "early access" framing); footer links; all public routes.
4. **Plain-English landing** — `app/page.jsx` hero: "We find promising startups weeks
   before the databases VCs use — and we can prove the date." Harmonic comparison moves
   below the fold with the receipts.
5. **Allocator mode** — `app/fund/setup`: second path "I invest as myself" → interests,
   check size, geography → creates a personal mandate (same watch machinery, no fund URL
   scrape). Onboarding modal copy de-jargoned (`components/onboarding-host.jsx`).
6. **Founder flywheel v1** — `/claim` gains structured fields (stage, raise amount,
   deck link, sectors); claims write to `companies` as founder-submitted sightings
   (source_type='founder_claim', shown with a distinct receipt), pending until reviewed.
7. **Clerk live keys** — user task (dashboard access required); code is ready.

**Acceptance:** vendor-review basics pass (no anonymous writes, no config leak, terms/
privacy live); a family office can onboard without a fund URL; pricing page live.

---

## Execution order

| Order | Slice | Rationale |
|---|---|---|
| 1 | A | Everything writes to records; do first, small surface area |
| 2 | E (parallel with A) | No dependency on A; kills every audit walk-out about trust |
| 3 | B | The moat; needs A's tables |
| 4 | C | Needs A's schema; volume from B makes it meaningful |
| 5 | D | Needs A (records) + B (facets); the demo-facing payoff |

Slices map cleanly to parallel agents: A and E immediately, B once A's schema merges,
C and D as follow-ons. Each slice = one branch, one PR, tests green before merge.
