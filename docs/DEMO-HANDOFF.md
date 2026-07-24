# Demo handoff — record tomorrow in ~15 minutes

**Goal:** Open laptop → paste env vars on Vercel (or `.env.local`) → open `/demo` → warm corpus → record a ~5 min investor film on prod.

**Prod URL:** https://meridian-mentor.vercel.app  
**Mentor package:** [docs/mentor-send-package.md](mentor-send-package.md)

**In-app checklist:** `/demo` (sidebar → Demo checklist)

---

## Tomorrow morning (15 min)

### 0. Redeploy Vercel production (2 min) — **do this first if `/api/corpus` is 404**

Prod may lag GitHub `main`. If `./scripts/demo-preflight.sh` warns about corpus 404 or missing `feedParity`:

1. Vercel → **meridian** project → **Deployments**
2. Latest deployment from `main` → **⋯** → **Redeploy** (Production)
3. Wait ~2 min, then re-run `npm run debate`

Optional: GitHub → Actions → **Vercel production deploy** (needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets).

### 1. Env vars on Vercel (5 min)

Vercel → Project → Settings → Environment Variables → **Production** → paste from `.env.demo` → **Redeploy** (Deployments → … → Redeploy).

| Variable | Required | Why |
|----------|----------|-----|
| `DATABASE_URL` | **Yes** | Flow feed, proof ledger, shares, webhooks |
| `ANTHROPIC_API_KEY` | **Yes** | Brief / memo generation |
| `PERPLEXITY_API_KEY` | **Yes** | Deep research path |
| `STARTUPHUB_API_KEY` | **Yes** | Index checks + corpus bulk fill |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Optional | `pk_live_…` removes yellow dev banner |
| `CLERK_SECRET_KEY` | Optional | Pairs with Clerk publishable key |
| `HUNTER_API_KEY` | Optional | Flow **Email** enrich button |
| `CRON_SECRET` | Optional | Operator-only cron curls (not needed to record) |

After redeploy, wait ~2 min for build to finish.

### 2. Terminal preflight (2 min)

```bash
./scripts/demo-preflight.sh
npm run debate
# or against prod explicitly:
./scripts/demo-preflight.sh https://meridian-mentor.vercel.app
node scripts/adversarial-debate.mjs https://meridian-mentor.vercel.app
```

**Adversarial debate** scores four personas (Investor, Analyst, GP, FO) from live prod probes + repo checks. **Average must be ≥ 7** before recording. Fix any amber persona the script prints.

Expect: `Overall average: 7.x/10 — READY`

Optional warm-up (adds records + index checks, ~60–90s):

```bash
curl -sS "https://meridian-mentor.vercel.app/api/corpus?force=1" | jq '{companyRecords, delta, bulkFill}'
```

Or click **Warm corpus** on `/demo`.

### 3. Browser preflight (3 min)

1. Open https://meridian-mentor.vercel.app/demo
2. Confirm green **Panache mandate active** (click **Activate Panache** if needed)
3. Open **Deal Flow** → **Watch this mandate** if not already watching
4. Confirm rows load with **Founders:** lines and Community filter works
5. Spot-check one row: **Proof PDF** or **Copy proof** downloads

### 4. Record (5 min)

Follow beat sheet on `/demo` or full script in `docs/investor-demo-film.md`.

**Open on Deal Flow**, not the landing page. Talk over any loading states.

---

## What to say (honest)

| Say | Don’t say |
|-----|-----------|
| Community incubators (Velocity, DMZ, CDL) structured with founders + provenance | “We replace Harmonic / PitchBook” |
| Verified index misses with dated StartupHub checks (numbers on Pilot page) | “1500 companies indexed nationally” |
| Proof packet + CRM export = ops handoff with receipts | EverTrace / WHOIS / Corporations Canada live |
| Corpus is live and growing (show count on screen) | Round marketing corpus numbers |

Current ballpark (Jul 2026): **~280–350 company records**, **~13 index checks** on ledger — cite whatever `/api/benchmark` shows after warm-up.

---

## Demo beat sheet (Flow-first, ~5 min)

1. **Deal Flow** — Panache, mandate watched, Community filter. Founders + source badges.
2. **Proof** — One strong row → Download proof PDF. “Falsifiable receipt, not a marketing blurb.”
3. **CRM** — Export CSV or CRM copy on same row. “Affinity-ready without retyping.”
4. **Brief** — Brief on domain-ready row. Talk over thesis-band drafting. Pursue.
5. **Coverage proof** — Measured wedge stats + optional Earliness tab for index misses.

Optional foil (25s): https://getfundingfromavc.vercel.app — fabricated portfolio vs Meridian provenance.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Empty Flow feed | Activate Panache; add thesis on Fund settings; Watch mandate |
| Yellow Clerk banner | Use `pk_live_` / `sk_live_` or ignore (demo still works) |
| `/api/corpus` 404 | Redeploy prod from latest `main` |
| `feedParity` missing in benchmark | Same — deploy lag |
| Wrong fund in switcher | `/demo` → Activate Panache, or clear `meridian_funds_store` in localStorage |
| Brief hangs | Check `/api/health` — Claude key; talk over “Drafting thesis band” |
| Low row count | Warm corpus button or curl `?force=1`; GitHub Action `prod-corpus-pump` also hits prod 4×/day |

---

## Files reference

| File | Purpose |
|------|---------|
| `.env.demo` | Minimal paste-ready env template |
| `scripts/demo-preflight.sh` | One-command prod health check |
| `scripts/adversarial-debate.mjs` | Four-persona score (must avg ≥ 7) |
| `lib/adversarial-debate.js` | Scoring rubric (unit-tested) |
| `app/demo/page.jsx` | In-app checklist + warm corpus |
| `docs/investor-demo-film.md` | Full spoken script + don’ts |
| `lib/fund-seeds.js` | Panache + Sagard auto-seed; Panache default active |

---

## After the demo (optional)

- `pk_live_` Clerk keys for external shares
- GitHub secrets `DATABASE_URL` + `STARTUPHUB_API_KEY` for overnight corpus fill workflows
- `HUNTER_API_KEY` if you want live email enrichment on camera
