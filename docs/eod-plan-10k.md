# EOD Plan — Satisfy the Four Personas

**Reality check:** Yes, it still isn’t enough. The plumbing is real; the substance isn’t.
Target by EOD: **10k+ company records**, live scraping that actually extracts, proof that
matches the UI, auth/write locks that survive diligence, and features that work for the
analyst + FO (GP remains a reference, not the buyer).

---

## 1. What we did wrong (root causes)

1. **Registered sources ≠ live scraping.** We seeded 149 URLs and called it an ingestion
   machine. Opportunistic runs hit 1 page at a time; many extracts return 0. Diligence
   saw `extractedTotal: 0` while we advertised 149 sources. That’s theater.
2. **We optimized for demo narrative over volume.** Hand-typed incubators → honesty layer
   → furniture, while the corpus stayed ~100–180. A data platform without data fails every
   persona.
3. **High-volume free sources were sidelined.** StartupHub (live on prod), Form D, domain
   registry, Product Hunt exist in code but aren’t the primary fill path. We LLM-scraped
   news pages (slow, sparse) instead of bulk APIs/feeds (fast, dense).
4. **Geo matching is buggy.** `"US"` doesn’t match the US-drop regex (`united states|usa`);
   Canada mandates still show OneSignal/Skyvern. Soft theses reorder the same list.
5. **We claimed “weeks before Harmonic” with same-day StartupHub misses on 8 rows.**
   Integrity score drops followed directly from marketing outrunning the ledger.
6. **Auth was “validated payloads,” not locked.** Anonymous `/api/outcomes` still 200s at
   120/hr. `auth: false`, `pk_test` on prod. Diligence polluted the DB again.
7. **Pilot UI contradicts benchmark.** Benchmark `verifiedMisses: 8` vs pilot copy saying
   none — self-inflicted integrity hit.
8. **LATAM/Africa were never seeded.** Expandability can’t improve if source seeds are
   Canada 56 / US 82 / LATAM 0 / Africa 0.
9. **Reachability still search-URLs.** We fixed the *rate math* but not the *contact*;
   analysts still have nothing to email.
10. **Memo score dipped** because briefs now fail more often on thin/record-only domains
    (scrape 400s) and latency stayed ~76s — usefulness felt worse when the feed mixed in
    domain-less rows.

---

## 2. Why scores dropped (specific)

| Persona / dimension | Before → Now | Why |
|---|---|---|
| Investor · eng quality | 6 → 5 | Open writes still; ingest often extracts 0; pilot/benchmark disagree |
| Investor · claim integrity | 4 → 3 | “Weeks before Harmonic” + age-0 misses; soft theses nearly identical |
| Investor · investability | 3 → 2 | Conditions still unmet; growth looked like curl traffic, not pipeline |
| Analyst · memo/outreach | 7 → 6 | More thin rows → brief scrape failures; still no real contacts |
| Analyst · expandability | 1 → 2 | Banner honest, but zero LATAM/Africa sources — only +1 for honesty |
| GP · trust | 3 → 4 | Slight up (redacted health, furniture); still auth:false |
| FO · clarity / onboarding | 2/1 → 5/6 | Real wins — then wealth relevance/trust still tank the buy |

**Net:** plumbing scores rose; **substance and honesty-under-pressure** fell where we
oversold. Fixing integrity is as important as fixing volume.

---

## 3. What “enough” means by EOD (acceptance)

Must be true on live prod before we call it done:

| # | Bar | Measure |
|---|---|---|
| A | **10k+ companies** in `companies` table | `/api/benchmark` `companyRecords ≥ 10000` |
| B | **Live scrape working** | 3 consecutive ingest runs with `extractedTotal > 0` and net-new sightings; `/api/cron/ingest` or Actions |
| C | **Proof coherent** | `entitiesChecked ≥ 500` (or ≥20% of corpus); pilot numbers == benchmark; no “weeks before Harmonic” until ages ≥ 7d or claim removed |
| D | **Matching not embarrassing** | Canada mandate drops `geography: US`; US Series B does not top-rank Databricks as “fit 40”; soft theses show coverage banners when weak |
| E | **Writes locked** | Unauthed `POST /api/outcomes` → 401/403 (device cookie alone insufficient for write); rate limit ≤ 20/hr; purge probe rows |
| F | **Feature loop works** | Flow → Brief (domain-bearing row) → Outreach → Share → Pursue → Thesis; FO can onboard via allocator; pricing/about live |
| G | **Non-Canada path non-empty** | ≥500 US-secondary/LATAM/Africa-tagged records OR honest empty + “expanding” with seeded sources for those geos in progress |

GP buy is **not** the EOD bar. Analyst fight-to-keep + FO trial + investor “conditions partially clearing” is.

---

## 4. Execution plan — three waves (EOD)

### Wave 1 — LIVE VOLUME (first, mandatory) → 10k companies

**Strategy:** stop relying on 1-page Haiku opportunistic hits. Fill from dense feeds in parallel.

1. **StartupHub bulk fill** (highest leverage — key already live on prod)
   - New `scripts/ingest/startuphub-bulk.mjs` + `lib/server/startuphub-bulk.js`
   - Run ~50–100 queries across stages/sectors/geos (AI, fintech, health, climate,
     marketplace, pre-seed, seed, Series A; Canada, US, LATAM keywords, Africa keywords)
   - Upsert every hit into `companies` + `sightings` (`sourceType: startuphub`)
   - Target: **3k–8k** rows depending on API credits/dedupe

2. **Domain-registry blast**
   - `run-domain-registry.mjs` with limit 2000+, broad keyword set, no Canada gate
   - Target: **1k–3k** live-domain incorporations

3. **Form D / Product Hunt bulk**
   - Form D adapter: raise caps, multi-day window → **1k+** issuers
   - PH if token present; else skip cleanly

4. **Parallel LLM scrape of all 149 sources + expand seeds**
   - `runIngestBatch({ limit: 149 })` via `/api/cron/ingest` or local/GH with secrets
   - Add **≥40** LATAM/Africa/US-secondary sources to `source-seeds.json` (CcHub, Andela
     alumni pages, 500 LatAm, Platanus, Techstars city pages, etc.)
   - Raise opportunistic pilot limit from 1 → 5 when not rate-limited
   - Target from extract: **500–2k** additional

5. **Dedupe + backfill ledger**
   - All bulk paths call `recordSighting` + `recordObservations`
   - One `ensureCompanyRecords` / recount; dashboard shows live `companyRecords`

**Owner order:** 1 → 2 → 3 → 4. Do not polish UI until `companyRecords ≥ 10000`.

### Wave 2 — INTEGRITY + TRUST (stops score freefall)

6. **Kill oversell copy**
   - Landing: remove “Ahead of Harmonic…” until Harmonic checks exist; replace with
     “Dated index checks against StartupHub; Harmonic next.”
   - Pilot: single source of truth = `/api/benchmark` stats only; delete contradictory labels

7. **Fix geo filter**
   - `looksUsOnly` / mandate-match: treat `\bUS\b`, `U.S.`, `United States`, state names
   - Canada-only mandate: drop `geography` containing US markers
   - Soft thesis: if `strongMatches === 0`, force coverage banner + don’t return full corpus
     as if it matched (cap to top weak matches or empty + banner)

8. **Lock writes for real**
   - Require Clerk userId **or** signed device session for POST outcomes/claim
   - Outcomes rate limit 20/hour; reject `guest` actor for writes
   - Purge `DILIGENCE_*` / `RateLimitTest*` rows on boot once
   - Stop blanket `isApiRoute` auth exemption for mutating routes (GET can stay public)

9. **Index-check scale after volume**
   - Batch unchecked entities 50–100/run with 429 cooldown (already started)
   - Prefer domain-bearing companies for checks (higher demo value)
   - Don’t claim “weeks before” until `medianMissAgeDays ≥ 7`

10. **UI ↔ API parity test**
    - `tests/unit/claims-audit` + a small pilot-metrics test: pilot verifiedMiss must equal
      ledger summary / benchmark field used

### Wave 3 — FEATURES THAT MAKE SOMEONE STAY (analyst + FO)

11. **Flow quality gate**
    - Default feed: domain-bearing OR founder-bearing only for Brief CTA
    - Show serial-founder chip when flag exists
    - Coverage banner always when `outsideCoverage`

12. **Brief reliability**
    - Skip autogen when no domain; show “Add domain / open website” instead of 400
    - Warm-start from company_research (already built) — surface “cached research” in UI
    - Keep outreach drafting on every memo

13. **Reachability v1 (honest but useful)**
    - Keep search LinkedIn labeled as search
    - Add MX-validated pattern email only behind explicit “Guess (unverified)” action —
      never in `rate`
    - Optional: Hunter/Snov later — not EOD blockers

14. **Allocator-first polish**
    - FO path default on `/fund/setup` for cold visitors
    - De-emphasize fund URL as secondary

15. **Operator kick**
    - Document exact curl for `/api/cron/ingest?limit=15&indexCheck=1` with CRON_SECRET
    - If GH secrets still unset: run volume from prod cron route + repeated benchmark/pilot
      (already proven path)

---

## 5. Sequencing for “by EOD”

```
NOW → Wave 1 bulk fill (StartupHub + registry + Form D + full source scrape)
   → hit companyRecords ≥ 10k
THEN → Wave 2 integrity (copy, geo, auth, pilot parity)
THEN → Wave 3 feature polish (flow gates, brief, FO default)
THEN → Re-run 4-persona smoke (same curl script) and only claim wins that APIs show
```

**Do not** spend EOD on new chrome, Harmonic partnerships, or SSO. Those aren’t why
scores failed.

---

## 6. Risks / honesty

- StartupHub credits may cap bulk fill — then lean harder on Form D + registry + extracts.
- 10k rows will be **noisy** (Form D issuers ≠ startups). Label `sourceType` clearly;
  Flow defaults to startup-like filters (domain + stage/sector keywords).
- True “weeks before Harmonic” **cannot** be earned by EOD — only stop lying about it.
- Clerk `pk_live_` still needs a human; we can lock writes to non-guest device IDs without it
  as a partial fix.

---

## 7. Success = personas move here

| Persona | EOD target outcome |
|---|---|
| Analyst | Non-empty useful feed OR honest empty + expanding sources; briefs work on domain rows; would trial daily |
| FO | Understands product; can onboard as self; doesn’t see Harmonic cosplay; maybe $500 trial interest |
| Investor | Conditions 2–3 move toward met; condition 1 partial without live Clerk; no term sheet yet but “watch” |
| GP | Still not a buyer — but stops calling labeling fraudulent; becomes neutral reference |
