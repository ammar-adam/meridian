# Meridian Rebuild — The Truth Engine Plan

**This is not a feature plan. It is a rebuild around one principle, with deletion as phase zero.**

> **The principle: no fact without a receipt.**
> Nothing renders in the product — no company, no founder, no metric, no memo sentence —
> unless it carries a machine-checkable receipt: *where it came from, when we saw it,
> how it was verified, and when it was last re-verified.* Anything that cannot meet
> that bar is deleted, not softened, not labeled, not hidden behind a tooltip. Deleted.

That single constraint is the anti-slop mechanism. Features don't accrete, because every
surface must be downstream of verified data, and verified data is expensive — so the
product stays exactly as big as the truth it can prove. It is also the moat: Harmonic,
Spectre, and PitchBook sell coverage. Nobody sells **proof**. The first tool that can
show a GP a dated, falsifiable receipt for *"we saw this company N days before any index,
here is the founder-confirmed record, here is your warm path in"* is not a better
screening tool. It is a different category.

---

## What "perfect" means, operationally (the gates)

"Perfect" is not a vibe. Each subsystem has one falsifiable definition and we do not
move past it until the gate is green:

| Subsystem | Perfect means | Measured how |
|---|---|---|
| **Data** | 100% of rendered facts are founder-attested OR two-source verified with dates. Zero rows with known-wrong founders. | Nightly audit job; decisive-accuracy ≥95% on spot checks; 0 open accuracy bugs |
| **Sourcing** | Net-new verified entities arrive weekly with **zero manual edits**. Every source shows a freshness SLA in-product. | `observations` table growth with `entry_method = 'watcher'` |
| **Earliness** | Median days-before-index is a real measured number vs. StartupHub **and Harmonic**, recomputed nightly, published. | `index_checks` table; public benchmark page |
| **Memos (Dossiers)** | Every number in the artifact traces to a citation or does not appear. New design, zero template filler sentences. | Citation-coverage lint on generation; design review vs. spec below |
| **Reachability** | Only verified channels shown (verified email, confirmed LinkedIn, warm path). Pattern guesses never render. | UI renders only `verification_status = 'verified'` channels |
| **Memory** | A GP switches devices and loses nothing. | All state server-side; localStorage used only as cache |

---

## Phase 0 — Tear down (delete before building)

Deletion is the point. Everything below either violates "no fact without a receipt"
or is surface area wider than the data underneath it.

| Delete / kill | Why |
|---|---|
| `/lists` page + batch-brief surface | Breadth feature on 12 rows of trusted data |
| `/team` beta | Half-built IC loop; rebuild later on server-side state or not at all |
| `/discover` as a standalone page | Merges into the one feed (Radar) as a thesis filter — two entry points for the same question is slop |
| `/pilot` in current form | "Pilot proof" with no pilot. Returns only when a real fund's 2-week numbers exist |
| Pattern-guessed emails in any UI (`lib/founder-email.js` render paths) | Bounced mail burns the customer's sender domain. Guesses may inform internal enrichment queues only |
| "Reachable = has a website" definition in `lib/reachability.js` | A gamed metric is worse than no metric |
| Cohort-date-as-first-seen in `lib/freshness-ledger.js` | It is not *our* observation; it proves nothing. Replaced by ledger `observed_at` |
| Current memo template design (`lib/memo-template.js`, `lib/memo-render.js`) | Scrapped and redesigned (Phase 4 spec below) |
| Mentor/demo scripts, demo-film docs, `lib/demo-memo.js` reachable paths | Product must not contain its own rehearsal |
| CSS Clerk badge hide in `app/globals.css` | Replaced by actual `pk_live_` keys (Phase 1 ops) |
| localStorage as source of truth (`lib/fund-profile.js`, `lib/mandate-watch.js`, `lib/memo-library.js`, thesis outcomes) | Becomes cache only; truth moves to Postgres |
| Known-wrong rows (Flomaru second founder, Innowind founders per `docs/sourcing-accuracy-results.md`) | Purged on day one. Wrong data never ships another day |

**Gate 0:** the deployed product contains zero known-false facts and zero demo scaffolding.
Smaller is the success criterion, not the cost.

---

## Phase 1 — The Truth Ledger (data foundation)

One Postgres (Neon) schema that everything else reads from. This is the product.

```sql
entities        (id, kind company|person, canonical_name, domain, status, created_at)
facts           (id, entity_id, field, value, source_id, observed_at,
                 verification attested|two_source|single_source|unverified,
                 verified_at, superseded_by)
sources         (id, adapter, url, trust_tier, last_checked_at, sla_hours)
observations    (id, entity_id, source_id, observed_at, entry_method watcher|manual|claim)
index_checks    (id, entity_id, index harmonic|startuphub|crunchbase, present bool, checked_at)
attestations    (id, entity_id, claimer_email, domain_verified bool, claimed_at, fields_confirmed jsonb)
watches         (id, account_id, fund_id, mandate jsonb, last_digest_at)
outcomes        (id, account_id, entity_id, outcome pursue|pass, reason, created_at)
```

Rules with no exceptions:

1. **Facts are append-only and versioned** (`superseded_by`). We can always show what we
   believed and when — that history *is* the provenance receipt.
2. **`observed_at` is when Meridian saw it**, never the cohort announcement date. The
   announcement date is a separate fact about the company, not about us.
3. **Render tier ≥ `two_source` or `attested`.** Single-source and unverified facts exist
   in the ledger for the enrichment queue but never reach a GP's screen.
4. Every rendered row exposes its **receipt**: sources, timestamps, verification tier,
   index-check results — one click, exportable, forwardable.

Also in this phase (ops, one-time): Clerk `pk_live_`/`sk_live_` on Vercel, remove the CSS
hide, upgrade hosting so cron actually runs (the habit loop cannot depend on a human
operating an external scheduler).

**Gate 1:** every feed row has a real `observed_at`, a verification tier, and a dated
index-check result. `/api/health` shows `clerkMode: production`.

---

## Phase 2 — Sourcing engine (watchers, not seeds)

Every source becomes a monitored pipeline with an SLA, or it is cut. No more seed arrays
edited by hand.

| Watcher | Mechanism | SLA |
|---|---|---|
| **Velocity / DMZ / CDL cohorts** | Diff watcher on announcement pages + directories (stable URLs, already mapped in `docs/incubator-sources.md`) | 24h |
| **Corporations Canada new incorporations** | Federal registry delta pull, filtered to tech-adjacent names/geos | 7d |
| **Domain deltas** | New `.ca` / relevant registrations cross-referenced against new incorporations — *new incorporation + new domain + ecosystem-adjacent name* is a pre-announcement signal no US tool computes | 7d |
| **IRAP / grants** | Auto-refresh of the open-data CSV (`docs/grant-sources.md`), diffed | 30d |
| **Nightly index check** | Every ledger entity checked against StartupHub, Crunchbase, and a **Harmonic trial/API** — result stored with date | 24h |

Each watcher writes `observations` rows with `entry_method = 'watcher'`. The product
shows freshness per source: *"Velocity — checked 6h ago."* A stale source shows stale —
honesty is rendered, not asserted.

The 6-model wedge (incubator, grants, domain registry, event hosts, entity resolution,
registry cross-ref) stops being a diagram and becomes six rows in a pipeline-health table.
Any model that cannot reach its SLA gets cut from the product until it can — event hosts
is the first candidate to cut rather than fake.

**Gate 2:** two consecutive weeks of net-new verified entities with zero manual edits,
visible in pipeline health.

---

## Phase 2b — Data layer depth (the pre-announcement tier)

Watchers make the data *fresh*; this phase makes it *deep and early*. Cohort
announcements are semi-public — an associate can read the Velocity blog. The data
that triggers a renewal is the tier **before** any announcement exists. Three depth
workstreams, each with a hard target:

**1. The pre-announcement signal layer (Tier 0).**
The earliest legally-clean signals a company emits, none of which any US-centric tool
computes for Canada:

| Signal | Source | Why it's early |
|---|---|---|
| New incorporation | Corporations Canada / Ontario Business Registry deltas | Exists weeks-to-months before a website |
| New domain registration | `.ca` + relevant gTLD registration deltas | The first public artifact most startups create |
| **Incorporation × domain × ecosystem-name match** | Cross-reference of the two above against ecosystem-adjacent founder/company names | The compound signal — *this specific person just incorporated and bought a domain* — is pre-announcement by definition |
| Grant/IRAP award | Open-data CSV deltas | Awarded before press exists |
| Community signal | Hack the North winners, WVG/Techyon-adjacent builders, Velocity pre-cohort — sourced through the founder's own network, entered as `entry_method='manual'` with named provenance | The relationship moat, structured. Manual is acceptable *here only* because access is the moat; everywhere else manual entry is a pipeline failure |

Tier 0 rows render with their own class — "Pre-announcement · signal-based" — and are
the headline of the product: companies that exist nowhere else *at all*, not just
"not yet in Harmonic."

**2. Entity resolution hardened into a real system.**
`lib/sourcing/entity-resolver.js` graduates from ~100-row de-dupe to the core engine:
probabilistic person↔company linking across all sources, brand-collision and
foundation-name filters as tested code, per-fact confidence scoring that feeds the
render-tier rules, and a merge-history so a resolved entity's receipt shows every
source that contributed. Resolution accuracy gets its own nightly audit sample.

**3. Enrichment waterfall to full depth on every rendered row.**
A row isn't "flow-ready" until it has: confirmed founders, stage signal, one-liner,
verified contact channel or warm path, and index-check status. The waterfall:
company page → cohort page → enrichment API (verified email) → attestation request
(Phase 3). Rows that stall in the waterfall stay in the internal queue — they never
render partially-enriched.

**Depth targets (90 days from Phase 2 start):**
- 66 → **500+ verified entities**, ≥30% carrying at least one Tier 0 signal
- ≥95% of rendered rows fully enriched per the definition above
- Median days-before-index **> 30** on Tier 0 rows (measured by Phase 2 index checks)

**Gate 2b:** at least one company surfaced by Tier 0 signals is *personally verified
as real and pre-announcement* (the test from `docs/data-sourcing-wedge-vision.md`),
and depth targets are on a visible trajectory in pipeline health.

---

## Phase 3 — Founder attestation (data that maintains itself)

The structural fix for the measured 33% error rate — and the getfundingfromvc flywheel,
finally built. The subjects of the data maintain the data.

- Public founder surface: **"Get seen by Canadian funds before you announce."**
  Founder claims their profile, verifies via company-domain email, confirms/corrects
  founders, stage, one-liner, raise intent. Claimed facts become `attested` — the highest
  tier — and show a **"Founder-confirmed"** mark with date.
- Attestation gives founders something real: visibility to watching mandates and
  a controlled narrative *before* they're announced anywhere else. That inbound motion
  grows the dataset without scraping and validates quality without a single fund
  sales cycle.
- Reachability rebuilt on top: verified email (enrichment API with verification status),
  confirmed LinkedIn, and **warm paths** — "this founder is in Velocity's May cohort;
  these people in your ecosystem overlap it." Our community access, productized as
  routes-to-founder. This is the layer Harmonic structurally cannot copy.

**Gate 3:** ≥10 claimed profiles; decisive accuracy ≥95% on the rendered feed;
zero pattern-guessed contact data anywhere in the UI.

---

## Phase 4 — One surface (Radar) and one artifact (the Dossier)

Collapse eight destinations into two. Depth over breadth.

**Radar** — the only feed. Mandate filter (absorbs Discover), durable server-side
"new since you last looked," receipt + verification tier + warm path on every row,
digest built in (server-side per account, Slack/email, actually scheduled). Pursue/pass
writes to `outcomes` and **visibly re-ranks Radar per fund** with a stated reason
("ranked up: you pursued 3 similar dev-tools companies") — thesis learning you can see,
running on real server-side signal. Library and Thesis become tabs of Radar reading the
same tables.

**The Dossier** — what Brief/Memo becomes. To be explicit: **the memo is not being
demoted — it is the flagship artifact of the product.** It is the origin of the company
(Evan's unprompted reaction to the NationGraph memo is the founding event, per `prd.md`),
it is where the data layer becomes visible value, and the thesis band is the one output
no index-first competitor can produce. What gets scrapped is the current *template
design*, never the artifact. Design spec:

- **Typography-first, print-grade**: single serif/sans pairing, 210mm-disciplined grid,
  generous whitespace — reads like a private bank note, not a SaaS export.
- **Provenance sidebar**: every number in the body is superscripted to a source line in
  the margin. A number without a citation fails generation lint and is removed, not
  hedged. No "estimated," no filler sentences, no boilerplate sections that render
  regardless of content.
- **Front matter is the receipt**: first observed, verification tier, index status
  ("not in Harmonic as of {date}"), founder-confirmed mark, warm path.
- **The fund band is the point**: the thesis-fit section leads, because it is the one
  thing no generic tool can produce — and it now cites the fund's own pursue/pass
  history as evidence.
- Sections appear only when they have verified content. A short honest dossier
  outranks a long padded one, always.
- **Outreach drafting is part of the Dossier, not a separate feature.** From any
  dossier: one click drafts the outreach email in the fund's voice, built from the
  thesis-fit section (`lib/outreach-prompt.js` / `app/api/outreach` already exist and
  are kept). The distinction that governs everything: **drafting is composition —
  always allowed; addresses are facts — only verified channels or warm paths ever
  render.** A guessed address presented as fact is banned; a drafted email the GP
  sends through their own channel is the product working.

**Gate 4:** a stranger uses Radar → Dossier → share → outcome on one device, opens
another device, everything is there. Dossier passes citation lint at 100%.

---

## Phase 5 — Proof in public (the category move)

- **The earliness benchmark, published.** A public page: *"Canadian pre-seed companies,
  median N days on Meridian before appearing in Harmonic / StartupHub / Crunchbase"* —
  recomputed nightly from `index_checks`, per-company drill-down, falsifiable by anyone
  with a Harmonic seat. Every vendor claims early; we are the only one measuring it in
  public. This page is the sales deck, the moat demonstration, and the press moment.
- **The real pilot.** One fund (Panache is the obvious candidate), two weeks on Radar,
  measured: rows surfaced, dossiers run, pursue rate, days-before-index on pursued
  companies. `/pilot` returns containing *their* numbers or it does not return.
- **The family-office letter.** FOs don't want tool seats; they want discreet, verified,
  co-invest-ready flow with an intro path. That is Radar output re-packaged as a weekly
  letter with receipts, under a hard privacy stance (we never signal who is looking).
  One template + positioning page; zero new infrastructure.
- **The rename decision.** "Meridian" collides with Meridian Credit Union (dominant in
  our exact geography) and is one letter from competitor Meridia. Rename when the
  benchmark launches — the brand should *be* the proof claim. Criteria: evokes
  seeing-first/provenance, ownable .com/.ca, zero Canadian finance collisions.
  Directions to test: **Firstseen**, **Provenant**, **Northline**, **Foreseen**.
  The benchmark launch is free press for the new name; renaming any earlier is churn.

**Gate 5:** the benchmark number is live, defensible, and cited by someone we didn't pay.

---

## What we are explicitly NOT building

The anti-slop contract. None of these until every gate above is green:

- No new memo "features" (templates, tones, export formats)
- No US expansion until every gate above is green **in Canada**. The US is explicitly
  the expansion thesis, not the wedge: the playbook (fragmented university/accelerator
  ecosystems + state incorporation deltas + domain deltas, invisible to index-first
  tools) replicates to any US region, and Canadian proof-of-earliness is the sales
  asset that opens it. Sequence, not scope creep.
- No attendee scraping, no LinkedIn automation, no gray-area data (existing risk rules stand)
- No team/IC suite, no comments, no pipelines-CRM — CRM copy stays a copy button
- No AI-generated facts, ever: models compose and reason over ledger facts; they never
  originate a fact. If the ledger doesn't know it, the dossier doesn't say it.

---

## The Demo Cut — SF, 48 hours

The full rebuild is not a 24-hour job, and pretending otherwise produces exactly the
half-fake state this plan exists to kill. The Demo Cut is the slice that makes the SF
demo *represent* the vision honestly — anchored to the two customer notes we actually
have:

- **Evan (Sagard, `prd.md`):** demo on a real deal he's actively looking at — a live
  URL, not a rehearsed script. The thesis band must read accurate to the fund's mandate.
  → The demo's centerpiece is a **live Dossier on a company the audience names**, with
  the thesis band leading.
- **Inshaal (Panache, vision docs):** every tool she evaluated is US-centric and
  index-first; the gap is pre-announcement, community-sourced flow.
  → The demo's differentiator is **Flow rows with receipts** — source, first-seen,
  index-test status — the thing Harmonic cannot show.

**Ships in the cut (by tomorrow):**

1. **Dossier visual overhaul** — the redesigned memo (typography-first, receipt front
   matter, thesis band leading, no filler sections) on the existing data. This is the
   single highest-impact item for a room in SF.
2. **Draft outreach from the Dossier** — the existing outreach pipeline surfaced as a
   first-class action: memo → drafted email in the fund's voice. Memos become
   actionable in the demo, not archival.
3. **Tear-down items that are pure subtraction:** Lists and Team out of nav; guessed
   emails out of every UI; reachability shown as real channels (LinkedIn / site) +
   "Draft outreach" instead of a gamed percentage; known-wrong rows purged.
4. **Receipts drawer on Flow rows** — the existing coverage/ledger data presented as a
   per-company receipt (source, cohort citation, first-seen, index-test result with
   date), honestly labeled.
5. **Clerk live keys** (human step, Vercel) + remove the CSS hide.

**Explicitly NOT in the cut** (post-SF, in plan order): Postgres ledger, watchers,
Tier 0 signals, founder attestation, Radar consolidation, benchmark page, rename.
Nothing in the demo may claim these exist.

---

## Order of execution

1. **Phase 0 + Phase 1 together** — tear-down and ledger land in the same release, so the
   product never exists in a "smaller but still fake" state.
2. **Phase 2** — watchers, starting with cohort diff + nightly index checks (the two that
   feed the benchmark).
   **Phase 2b** — data depth: Tier 0 pre-announcement signals, hardened entity
   resolution, enrichment waterfall. Runs continuously from here on; depth targets
   are tracked in pipeline health, not a one-time push.
3. **Phase 3** — attestation + verified reachability.
4. **Phase 4** — Radar consolidation + Dossier redesign (design work can start in
   parallel with Phase 2; it ships only on ledger data).
5. **Phase 5** — benchmark public, real pilot, FO letter, rename.

Every phase ends with its gate measured on prod, not asserted in a doc. If a gate fails,
we fix or cut — we do not relabel.
