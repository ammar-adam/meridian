# Meridian Setup Guide

## Prerequisites

- Node.js 18+
- npm
- **Required:** Anthropic + Perplexity API keys
- **Optional:** Neon (`DATABASE_URL`), Clerk (auth/sync), StartupHub (Discover feed), PitchBook (enterprise Discover)

---

## 1. Install

```bash
cd meridian
npm install
```

---

## 2. Environment variables

Copy `.env.example` → `.env.local`:

```env
# Required — AI pipeline
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Optional — Discover sourcing
STARTUPHUB_API_KEY=...
PITCHBOOK_API_KEY=...

# Cloud (recommended for production)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

MERIDIAN_ENABLE_SERVER_PDF=true
```

Restart the dev server after changing keys.

**Health check** (with dev server running):

```bash
curl http://localhost:3000/api/health
# skip live Anthropic ping (faster):
curl "http://localhost:3000/api/health?quick=1"
```

Expected: `"anthropicKeyPresent": true`, `"anthropicPing": { "ok": true, "model": "claude-haiku-4-5-20251001" }`, `"perplexity": true`. With `DATABASE_URL`: `"database": true`, `"shareLinks": true`.

`anthropic` is `true` only when the key is present **and** the live ping succeeds. If ping fails, check `anthropicPing.error` in the response.

Optional override for the fast draft model:

```env
ANTHROPIC_FAST_MODEL=claude-haiku-4-5-20251001
```

**Database schema:**

```bash
npm run db:push          # Drizzle push (workspaces, shares, edits)
npm run db:migrate       # batch_jobs table (if not already applied)
```

---

## 3. Run locally

```bash
npm run dev
```

Open **http://localhost:3000**

No fund setup required — guest context works out of the box. Optional: configure your fund at `/fund/setup` for mandate-specific thesis bands.

---

## 4. Core workflows

### Brief (single company)

1. Go to **/brief** or paste URL on landing
2. Scrape preview appears in ~2s
3. Click generate → draft memo in ~5s, full brief in ~30–75s (Auto mode)
4. Edit inline → **Pursue** / **Pass** → share link for GP review

### Lists (batch)

1. Go to **/lists**
2. Paste up to 50 URLs (one per line)
3. Batch runs one URL at a time on server (3 parallel when local-only)
4. **Auto-resumes on page refresh** if interrupted
5. Export CSV when done

### Discover

1. Go to **/discover**
2. Enter search thesis (e.g. `AI infrastructure, Series A, North America`)
3. Run pipeline → filter results → **Brief selected** or **Brief top 5**

### Library

**/library** — all saved briefs. Bulk-select → **Share with GP**. GP outcomes sync back on reload (via share link polling or cloud edit sync when signed in).

### Thesis

**/thesis** — pursue rate, thesis corrections, behavioral learning dashboard.

### Share (GP review)

Creator shares `/share/[id]` → GP clicks Pursue / Pass / Need more info → outcome appears in Library and feeds Discover ranking.

---

## 5. Without API keys

- **/memo** with no saved brief shows empty state
- Discover, Brief, and batch **require** Anthropic + Perplexity keys

---

## 6. Deploy (Vercel)

1. Push repo to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add env vars from section 2
4. Deploy

**Clerk (production):** On Vercel, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` to `pk_live_…` / `sk_live_…` (not `pk_test_…`). Confirm `/api/health` reports `clerkMode: "production"` and `clerkDemoRisk: false`, then remove the CSS hide block in `app/globals.css`. Until live keys are set, that CSS hide remains required. Sidebar Status only surfaces failing *required* services (Claude / Research / Database); optional APIs like PitchBook are not advertised when off.

**Monday digest:** Set `SLACK_WEBHOOK_URL` + `CRON_SECRET`. From the product, Flow → “Send to Slack” / Copy digest works without cron. For a weekly job, schedule:

```
GET https://meridian-eight-sandy.vercel.app/api/cron/flow-digest
Authorization: Bearer <CRON_SECRET>
```

(Mondays preferred. Vercel Hobby cannot reliably ship `crons` in `vercel.json` — use an external scheduler.)

Production: **https://meridian-eight-sandy.vercel.app**

`vercel.json` sets API timeouts (research 300s, brief 300s). Vercel **Pro** recommended for long research calls.

Post-deploy:

```bash
npm run db:push
npm run db:migrate
```

Set `CRON_SECRET` on Vercel (random string). The `/api/cron/batch-tick` route is ready for background batch.

**Vercel Hobby:** built-in cron is limited to once/day — use a free external scheduler (e.g. [cron-job.org](https://cron-job.org)) to `GET` your deploy URL every 2 minutes:

```
GET https://meridian-eight-sandy.vercel.app/api/cron/batch-tick
Authorization: Bearer <CRON_SECRET>
```

**Vercel Pro:** add to `vercel.json`:

```json
"crons": [{ "path": "/api/cron/batch-tick", "schedule": "*/2 * * * *" }]
```

Without cron, batch still runs via `/lists` (keep tab open) or auto-resumes on refresh.

**CI / tests:**

```bash
npm run test:unit          # unit tests (Vitest)
npm run test:ci            # lint + unit + build
npm run smoke              # HTTP checks (set BASE_URL for prod)
```

Pull requests to `main` run GitHub Actions CI automatically. See [CONTRIBUTING.md](CONTRIBUTING.md).

**Smoke tests:**

```bash
npm run smoke
# against production:
BASE_URL=https://meridian-eight-sandy.vercel.app npm run smoke
```

Anonymous users get a `meridian_did` cookie for isolated batch jobs (no shared `guest` collision).

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| `ANTHROPIC_API_KEY is not configured` | Set real key in `.env.local`, restart dev server |
| Brief times out | Use Quick research mode; check Vercel plan limits |
| Batch stops mid-run | Refresh `/lists` — job auto-resumes |
| GP outcome not in Library | Reload Library (polls share link); sign in for cloud sync |
| Share links 503 | Set `DATABASE_URL` on server |
| Discover returns few companies | Add `STARTUPHUB_API_KEY` or broaden thesis |
| Old routes | `/source` → `/discover`, `/app` → `/brief`, `/insights` → `/thesis` |

---

## Route map

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/brief` | URL → one-pager |
| `/lists` | Batch up to 50 URLs |
| `/discover` | Thesis → ranked companies |
| `/library` | Saved briefs + GP share |
| `/thesis` | Fund learning dashboard |
| `/memo` | Brief viewer + pursue/pass |
| `/share/[id]` | GP review page |
| `/fund/setup` | Optional fund configuration |
| `/fund` | Edit fund profile |

---

## Demo checklist

1. Paste one well-known Series A URL on `/brief` — preview <3s, full brief <75s (Auto)
2. Batch 3 URLs on `/lists` — refresh mid-run, confirm auto-resume
3. Share a memo → incognito Pursue → Library shows GP outcome
4. Run Discover with a real thesis → brief one result → check thesis band
