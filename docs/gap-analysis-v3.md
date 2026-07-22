# Gap Analysis — v1 vs v2, and the road to the aggregate data platform

Written after the four-persona audit (GP / early-stage analyst / family office / prospective investor)
and the founder's own diagnosis: **we limited the data sources, so the data wedge stopped being data.**

---

## Part 1 — What each version got right and wrong

### V1 (Brief engine: Perplexity + StartupHub) — what worked

1. **Live research on any company on Earth.** Six narrowly-scoped Sonar passes per company
   (product, funding, team, market, defensibility, news) with per-section confidence scoring
   (`lib/research-passes.js`). The analyst auditor scored the memo pipeline 7/10 and said it
   beats her current first-pass workflow.
2. **Live candidate sourcing.** StartupHub API integration (`lib/startuphub.js`) with ordered
   query fallbacks — real new companies, not a fixed list.
3. **Workflow primitives that survived:** batch lists, quick/deep research modes, server PDF,
   share links, thesis parsing, behavioral learning in Discover.

### V1 — what was shit

1. **No unique data.** Everything came from the same StartupHub/Perplexity anyone can query.
   Zero earliness, zero exclusivity — a nicer UI on commodity data.
2. **Nothing accrued.** Every brief re-did all research from scratch (100–160s); no company
   record store, no cache, no history. The product got no smarter with use.
3. **No feed, no habit.** A tool you visit when you remember, not a feed you return to.
4. **All state client-side.** Memos, watches, outcomes in localStorage.

### V2 (Meridian wedge) — what worked

1. **Honesty engineering.** Verification statuses that refuse to claim what isn't checked,
   provenance receipts, GAPS.md self-audit culture. Every auditor called this the most
   credible thing in the product.
2. **Truth ledger architecture.** Server-side first-observed timestamps, dated index checks,
   durable outcomes (`lib/server/truth-ledger.js`) — the right proof machine, just unfed.
3. **The product loop.** Flow → Dossier → Outreach → Share → Pursue → Thesis is the right
   shape; digest + CRM export show real user contact.
4. **The sales narrative.** "Community-first, before the indexes, with receipts" is the right
   story for the wedge — the story just outran the data.

### V2 — what we did wrong

1. **We replaced the live engine with a hand-typed list.** `/flow` serves 66 manually
   transcribed companies (`lib/sourcing/incubator-adapter.js`) and never calls Perplexity or
   StartupHub — both of which are configured and paid for on prod. We disconnected v1's
   engine from v2's feed.
2. **We narrowed geography instead of widening sources.** Three Waterloo/Toronto programs
   became "the data wedge." The domain-registry adapter is regex-gated to Canada
   (`run-adapters.js:31`).
3. **We shipped labels ahead of evidence.** Auto-`community_first` on every incubator row,
   `fitScore: 88` for off-mandate companies, `reachability rate: 1` counting search links.
4. **Demo-driven development.** Each deadline added chrome and narrative; ingestion — the
   actual moat — stayed manual.

### The synthesis

**V1 was an engine without data. V2 was a data story without data.**
The 10/10 product is v1's live research engine + v2's truth ledger + an ingestion machine
that runs at scale without a human. All three exist in the repo today; none are connected.

---

## Part 2 — The problems (15)

**Data problems**

1. **Coverage is a rounding error.** 66 companies, 3 programs, 1 metro. Harmonic: ~20M
   companies. There is no version of "data wedge" at this volume.
2. **Zero automated ingestion.** Nothing enters the corpus unless a human edits a JS array.
   The subscription promise ("new every Monday") is structurally false.
3. **No scheduling/compute layer.** Vercel Hobby, no crons; scraping 400 sources daily
   cannot run on request-time serverless functions.
4. **The two pipelines never merged.** Live research (`/api/source`, 157s, flaky) and static
   feed (`/flow`, instant, fake) are separate worlds. No shared company record.
5. **No durable company records.** The ledger stores names + timestamps; there is no system
   of record accumulating signals, founders, funding, and history per company. "New since
   last visit" and "the product gets smarter" are impossible without it.
6. **People are invisible.** No founder graph, no serial-founder detection, no talent
   signal — the single highest-alpha data class (repeat founders incorporating quietly)
   isn't even modeled.
7. **No enrichment.** Zero verified emails, zero direct LinkedIn profiles; reachability is
   search links and pattern guesses.

**Trust problems**

8. **Claims outrun evidence.** `community_first` auto-labels, "verified not-in-index" from
   a hardcoded 3-name registry, `reachability rate: 1`, fitScore theater. Auditors called
   these walk-out moments.
9. **The proof engine has never run.** `index_checks` table: 0 rows. The cron exists but is
   scheduled nowhere.
10. **Security/tenancy would fail any vendor review.** Dev-mode Clerk on prod, every `/api`
    route auth-exempt, anonymous writes to `/api/outcomes`, `/api/health` leaking config,
    no orgs/roles/SSO, state in localStorage.
11. **No institutional furniture.** No terms, privacy, about, or pricing pages. A real
    fund's name ("Panache Ventures") on an illustrative case study.

**Product problems**

12. **Mandate matching is fake.** Same 12 companies for "US Series B fintech" and "Canadian
    pre-seed AI"; `canadianMandate: true` hardcoded in the flow path.
13. **Expansion is impossible by construction.** US/LATAM/global theses return Waterloo
    companies with no honesty note. The analyst's fund (the actual ICP) got zero usable rows.
14. **Latency where it matters.** 124–157s briefs with flaky passes and no record cache;
    the fast path is fast only because it's static.
15. **Positioning confusion.** Landing page speaks VC-insider jargon ("Harmonic",
    "pre-index") and onboarding forces a fund mandate — family offices and non-VC allocators
    (half the stated market) cannot even onboard as themselves.

---

## Part 3 — The ideas (15)

**The data machine (problems 1–7)**

1. **One extraction pipeline, hundreds of sources — not hundreds of scrapers.** A source
   registry (one config row per source: URL, type, cadence, geography) + a single
   LLM-extraction worker: fetch page → strip to text → Claude Haiku extracts structured
   entities (company, founders, program, date) → ledger. Adding a source becomes a 2-minute
   config edit. Seed with the top ~200 NA university entrepreneurship centers/incubator news
   pages + top ~200 accelerators (Techstars city programs, YC batch pages, 500, Antler, EF,
   Plug and Play, gener8tor…).
2. **A real scheduler on free compute.** GitHub Actions cron (already in the repo for CI)
   runs the ingestion worker daily (hot sources) / weekly (long tail), writes to Neon.
   No Vercel Hobby limitation, no laptop dependency, fully auditable runs.
3. **The Company Record.** One durable table per company that merges every signal over time:
   source sightings (each with first-seen), domain, founders, funding events, index checks,
   enrichment, outcomes. Every surface (Flow, Brief, Library, digest) reads records.
   Records make briefs instant-start, feeds honest, and the product compounding.
4. **The signal stack** — layered, each with a receipt class:
   - Tier 0: new incorporations × live domains (built); certificate-transparency log
     monitoring for brand-new domains (crt.sh)
   - Announcements: university/incubator/accelerator cohort pages (idea 1)
   - Launch: Product Hunt API (GraphQL, free), Show HN, BetaList
   - Capital: **SEC Form D full-text (free, daily — every US raise)**, SEDAR+ exempt
     distributions for Canada, grant databases (IRAP, SBIR/STTR, NSF)
   - Traction: startup job postings (Wellfound, Greenhouse/Lever public boards), GitHub org
     creation + repo velocity, app-store launches
   - Research: OpenAlex/arXiv for lab spinouts, tech-transfer offices
5. **The founder graph + "stalking agent."** Model people, not just companies. Track
   operators and past founders (exits via news passes, LinkedIn search surface, Form D
   officer names); alert when a known 2x founder incorporates, registers a domain, or goes
   quiet on a current employer. Highest-alpha signal in venture; nobody serves it downmarket.
6. **The scout agent (v1 engine as a feed generator).** Nightly Perplexity Sonar sweeps per
   watched mandate ("pre-seed fintech founders announced/launched this week in X"), parsed
   into candidate records with citations. This is what made v1 magic — run it continuously
   for the fund instead of once per URL.
7. **Enrichment waterfall, strictly labeled.** Domain → MX validation → cheap verification
   tier (Hunter/Snov) → verified email; else LinkedIn direct URL; else search link labeled
   as a search link. Rate counts only the top two.

**Trust (problems 8–11)**

8. **Proof engine on schedule.** Same GH-Actions worker runs full-corpus dated index checks
   (StartupHub now, Harmonic via a customer's seat in pilots); `verifiedMisses` accrues
   weekly; every unproven label is deleted the same day this ships.
9. **Claims audit as CI.** A test that fails the build if UI copy asserts a verification
   status with no backing DB row — honesty enforced by machine, which is itself a demo-able
   differentiator.
10. **Tenancy + furniture sprint.** Live Clerk, orgs/roles, locked write endpoints, terms/
    privacy/about/pricing pages, anonymized case study. One focused pass, permanent fix.

**Product & business (problems 12–15)**

11. **Real mandate matching.** Embedding-based thesis↔company scoring + hard stage/geo
    filters, with an honest coverage banner when a mandate exceeds current corpus
    ("We cover X of your geography today — here's what's arriving next").
12. **The founder-side flywheel.** Expand `/claim` into "get discovered by 50 funds":
    founders submit structured data (stage, raise, deck) — proprietary, unscrapeable data
    that compounds and that Harmonic structurally does not have.
13. **The VC ecosystem, one price.** Sourcing feed + dossiers + outreach drafting +
    institutional library + thesis-over-time as one $99–499/seat/mo self-serve product —
    explicitly the anti-$50k-seat. Lean funds, emerging managers, family offices, solo GPs.
14. **An allocator mode.** Onboard as a person with interests and check size, not a fund
    URL — opens the family-office half of the market and kills the jargon wall.
15. **The public earliness scoreboard.** Once checks accrue: a public page showing median
    days-earlier vs indexes, per source, updated nightly from the ledger. The marketing
    site writes itself and every row is falsifiable.

---

## Part 4 — Sequencing logic (not a build plan yet)

The dependency chain is: **records → ingestion → proof → matching → surfaces.**
Ideas 1–3 unblock everything; 8 makes the wedge claim real; 11 makes demos survive
skeptics; the rest compound. What made v1 good (live research) and v2 good (receipts)
both plug into the Company Record — that is the one abstraction the product has been
missing through both versions.
