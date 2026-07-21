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

**The Dossier** — what Brief/Memo becomes. Scrap the current template design entirely.
Design spec:

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
- No US expansion, no second geography, no "national scale" before Waterloo/Ontario
  density is proven (Phase 1 discipline from `docs/data-sourcing-wedge-vision.md` stands)
- No attendee scraping, no LinkedIn automation, no gray-area data (existing risk rules stand)
- No team/IC suite, no comments, no pipelines-CRM — CRM copy stays a copy button
- No AI-generated facts, ever: models compose and reason over ledger facts; they never
  originate a fact. If the ledger doesn't know it, the dossier doesn't say it.

---

## Order of execution

1. **Phase 0 + Phase 1 together** — tear-down and ledger land in the same release, so the
   product never exists in a "smaller but still fake" state.
2. **Phase 2** — watchers, starting with cohort diff + nightly index checks (the two that
   feed the benchmark).
3. **Phase 3** — attestation + verified reachability.
4. **Phase 4** — Radar consolidation + Dossier redesign (design work can start in
   parallel with Phase 2; it ships only on ledger data).
5. **Phase 5** — benchmark public, real pilot, FO letter, rename.

Every phase ends with its gate measured on prod, not asserted in a doc. If a gate fails,
we fix or cut — we do not relabel.
