# 48-Hour Build Plan — Horizon 1 (Demo Cut) + Horizon 2 (Truth Core)

Two horizons, one deadline: SF demo in 2 days. H1 makes the demo honest and
excellent. H2 ships the *core* of the rebuild — the Truth Ledger — so the demo
can say "this is measured, live, in a database" instead of "this is planned."

Scope discipline: everything here is buildable with infra that already exists
(Neon + Drizzle are live in `lib/db/`, cron routes exist, adapters exist).
Anything requiring new external access (Harmonic API, enrichment vendors,
founder-claim emails) is explicitly OUT and stays in `docs/rebuild-plan.md`
for post-SF.

---

## Horizon 1 — Demo Cut (finish first; blocks the demo)

### H1.1 Honest reachability — DONE
Pattern-guessed emails removed from `lib/reachability.js`,
`components/reachability-actions.jsx`, `components/outreach-drawer.jsx`,
`lib/flow-digest.js`. Only verified emails render, anywhere, ever.

### H1.2 Outreach drafting first-class — DONE
"Draft outreach" on every memo (`app/memo/page.jsx`), not gated behind an
outcome. Drafting is composition; addresses are facts.

### H1.3 Nav teardown — DONE
Lists + Team out of nav (`components/workspace-shell.jsx`,
`components/generate-workspace.jsx`). `/pilot` renamed "Coverage proof"
(no pilot has run; the stats are coverage measurements).

### H1.4 Receipt on every Flow row
`components/coverage-proof.jsx` becomes the receipt: verification label,
index-test result **with tested-at date**, first-seen, age, stage, program
note, provenance citation — one expandable block per row in
`components/source-table.jsx`. When H2.2 lands, the receipt shows
**Meridian first-seen** (our observation timestamp from the ledger) alongside
the cohort date, clearly labeled.

### H1.5 Dossier (memo) redesign
`app/memo/page.jsx` + memo styles. The memo is the flagship artifact:
- **Receipt front matter**: source, first-seen, verification status, stage —
  a compact provenance band at the top of the memo, print-safe.
- **Thesis band leads** visually: the fund-fit section is the first thing a
  reader sees after the header.
- Typography: tighten to a print-grade hierarchy (existing 210mm discipline),
  remove filler section chrome; sections without content do not render.

### H1.6 Prod verification
Full loop on prod: Flow → receipt → Brief (live URL) → Dossier → Draft
outreach → Share → Pursue → Library/Thesis. Non-scripted inputs. Plus
`npm run test:ci`.

**Human step (only you):** Clerk `pk_live_`/`sk_live_` on Vercel → confirm
`clerkMode: "production"` → delete the CSS hide in `app/globals.css`.

---

## Horizon 2 — Truth Core (ships this cycle, demoable as "live, measured")

### H2.1 Ledger schema (`lib/db/schema.js` + migration)
New tables, additive, no breaking changes:

```
ledger_entities     (id, name, normalized_name, domain, source, program,
                     cohort_date, provenance, first_observed_at, meta jsonb)
index_checks        (id, entity_id, index_name, present bool, detail,
                     checked_at)
flow_outcomes       (id, actor_id, entity_name, domain, outcome, fund_name,
                     created_at)
```

Runtime-safe creation (CREATE TABLE IF NOT EXISTS on first server use) so
prod needs no manual migration step.

### H2.2 Real first-seen (`lib/server/truth-ledger.js`)
On every server-side Flow/Discover build, upsert entities into
`ledger_entities`. The first insert timestamps `first_observed_at` — from
that moment, "first seen" means **when Meridian saw it**, not the cohort
announcement. API responses carry `meridianFirstSeen` per company; the
receipt renders both dates, labeled. The ledger accrues from tonight —
by the demo it is a real, growing, server-side record.

### H2.3 Nightly index check (`app/api/cron/index-check/route.js`)
For each ledger entity: StartupHub name search (same falsifiable method as
`scripts/verify-falsifiable-test.mjs`, rate-limited, honest). Result rows in
`index_checks` with `checked_at`. The receipt's "Not in index" claim comes
from the DB with a date — no more hardcoded 3-company registry
(`INDEX_TEST_REGISTRY` in `lib/freshness-ledger.js` becomes seed data only).
Cron-scheduled where available; also triggerable via authorized GET for the
demo window.

### H2.4 Server-side outcomes
Pursue/pass writes to `flow_outcomes` keyed by the existing actor id
(`lib/actor-id.js`) in addition to localStorage (cache, per the rebuild
plan). `/thesis` pursue-rate reads server-side when DB is on. Cross-device
memory starts existing.

### H2.5 The earliness page (`/benchmark` + `/api/benchmark`)
Public, honest, computed from the DB nightly state:
- N entities in ledger · N checked against index · N verified-miss with dates
- Median age since first-seen for verified-miss rows
- Explicit copy: "checked against StartupHub; Harmonic checks post-SF"
This replaces slideware with a live page — the category move, scoped to
what we can honestly measure today.

### Out of scope this cycle (stays in rebuild-plan.md)
Harmonic API checks, watchers/auto-ingest, Tier 0 incorporation×domain
signals, founder attestation, Radar consolidation, rename, FO letter.

---

## Execution order (single timeline)

1. H1.4 receipts → H1.5 dossier → H1.6 verify → **push, PR, deployable demo state**
2. H2.1 schema → H2.2 first-seen → H2.3 index check → H2.4 outcomes → H2.5 benchmark
3. Re-verify prod end-to-end; the demo narrative then includes the live ledger.

Gate for calling it done: the SF demo can be run by a stranger on prod with
zero rehearsed inputs, and every on-screen claim traces to a receipt or a
database row.
