# Honest gaps to 8/10

Scoring convention: **as a product a fund would pay for.** No grade inflation.

## Where we are

~**6 / 10**. The data wedge is now *visible and checkable* in-product, not just claimed:

| Built (this pass) | File |
|---|---|
| Freshness ledger: first-seen + age + stage + index-test status | `lib/freshness-ledger.js` |
| Coverage proof on every row (verified-miss vs community-sourced) | `lib/coverage-proof.js`, `components/coverage-proof.jsx` |
| Honest reachability (founder handle OR website; rate not gamed by hiding rows) | `lib/reachability.js` |
| Full community feed (not founders-only) | `lib/discover-fast.js` `buildIncubatorFlowDiscover` |
| Monday digest "N new for your mandate" + Slack + cron route | `lib/flow-digest.js`, `app/api/digest`, `app/api/cron/flow-digest` |
| CRM copy per row (Affinity/Clay-ready) | `lib/crm-export.js` `companyToCrmRow` |
| Pilot case study from live ledger numbers | `lib/pilot-case.js`, `app/pilot` |
| Deal Flow is home; Brief is the action | nav, workflow strip, hero, onboarding |

## What still blocks 8 (honest)

1. **Clerk still `development` on prod** — code is live-ready; needs `pk_live_`/`sk_live_` set on Vercel (human, 2 min). Until then, credibility tell remains.
2. **First-seen is cohort-date, not a persistent ledger** — we record the community announcement date (real, cited) but do NOT yet persist "when Meridian first surfaced X" in a database that accrues over time. A true freshness ledger a GP trusts needs server-side first-seen timestamps (Neon table).
3. **Index-absence is tested for 3 companies, asserted for none else** — honest, but thin. Real proof = a nightly StartupHub/Harmonic name-check across the whole feed, stored, dated.
4. **Watches are client-side** — digests default to Panache/Sagard or `DIGEST_WATCHES` env, not each GP's saved mandate in a DB. "N new since your last digest" is not yet per-account durable.
5. **Founder emails are pattern guesses** — labeled as such. Verified emails (enrichment provider) would move reachability from "path" to "contact."
6. **Data depth** — 66 cohort companies across Velocity/DMZ/CDL. Repeatability (auto-refresh on new cohorts) is manual. More sources (Communitech events, Hack the North, grants) still to wire.
7. **Team/IC loop** — Share + CRM copy exist; multi-GP assignment, comment threads, and pipeline memory are light.

## Next, in moat-order (not chrome)

1. Neon `first_seen` table → real freshness ledger + "new since last digest" per fund.
2. Nightly index-check job → per-company `notInIndex` with a date, stored.
3. Verified founder emails via enrichment; keep guesses clearly separate.
4. Server-side watches tied to account; digest reads them.
5. Auto-ingest new cohorts (repeatability) — the thing that makes it a subscription.
