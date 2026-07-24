# Meridian

**AI-powered investment memos for venture capital.** Paste a company URL — get a mandate-specific one-page research brief in under a minute (Auto mode).

**Live demo:** [meridian-mentor.vercel.app](https://meridian-mentor.vercel.app) (legacy: meridian-eight-sandy.vercel.app until redirect is attached)

---

## What it does

Meridian automates first-pass deal research: scrape the website, run deep web research, synthesize through Claude, and render a polished one-pager (product, market, team, defensibility, **fund-specific thesis fit**).

The thesis band is the differentiator — not generic AI summaries, but why *your fund* should care, with portfolio overlap and mandate alignment.

```
URL in → scrape (~2s preview) → research → generate → memo PDF-ready
```

**Primary loop:** Discover companies by thesis → batch brief → pursue/pass → fund learns preferences.

**Secondary loop:** Already have a URL? `/brief` → one memo in ~30–75s (Auto).

---

## Features

| Feature | Route | Notes |
|---------|-------|-------|
| Single brief | `/brief` | Instant scrape preview, then full pipeline |
| Batch lists | `/lists` | Up to 50 URLs, concurrency 3, auto-resumes on refresh |
| Discover | `/discover` | Thesis → ranked companies → batch brief |
| Library | `/library` | Saved briefs, bulk GP share, CSV export |
| Share + GP review | `/share/[id]` | Pursue / Pass / Need more info |
| Learning | `/thesis` | Pursue rate, thesis edits, revealed preferences |
| Cloud sync | Sign in | Clerk + Neon — memos, edits, shares across devices |

Works **without fund setup** — guest context is the default. Configure your fund at `/fund/setup` when ready.

---

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router) + Tailwind |
| Scraping | Server-side fetch + regex |
| Research | Perplexity (`sonar-deep-research`) |
| Synthesis | Anthropic Claude (`claude-sonnet-4`) |
| PDF | Playwright (server) or browser print |
| Auth | Clerk |
| Database | Neon Postgres (shares, sync, batch jobs) |
| Deploy | Vercel |

---

## Quick start

```bash
git clone https://github.com/ammar-adam/meridian.git
cd meridian
npm install
cp .env.example .env.local   # add API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → paste a URL on `/brief`.

**Required env vars:** `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`

**Optional (cloud product):** `DATABASE_URL`, Clerk keys — enables share links, cross-device sync, persistent batch jobs.

Full setup, deploy, and troubleshooting → **[SETUP.md](./SETUP.md)**

---

## Architecture

```
app/page.jsx          Landing + URL input
app/brief/page.jsx    Generate workspace (scrape preview → pipeline)
app/memo/page.jsx     Memo viewer, inline edits, pursue/pass, share
app/lists/page.jsx    Batch job dashboard
app/discover/page.jsx Thesis-driven company search
app/library/page.jsx  Saved briefs command center

app/api/scrape        og:image, title, description (~2s)
app/api/brief         Unified pipeline (scrape → research → generate)
app/api/batch         Persistent batch jobs (Neon)
app/api/share         GP share links with outcome capture

lib/memo-pipeline-server.js   Server orchestration
lib/batch-runner.js           Client batch worker (concurrency 3)
lib/behavioral-rank.js        Learned ranking on Discover
public/memo-template.html     A4 memo template (210mm)
```

Pipeline details and agent rules → **[AGENTS.md](./AGENTS.md)**

---

## Health check

```bash
curl https://meridian-eight-sandy.vercel.app/api/health
```

Returns status for Anthropic, Perplexity, database, Clerk, and feature flags.

---

## Project docs

| Doc | Purpose |
|-----|---------|
| [SETUP.md](./SETUP.md) | Install, env vars, deploy, troubleshooting |
| [prd.md](./prd.md) | Product requirements and roadmap |
| [AGENTS.md](./AGENTS.md) | Architecture reference for contributors |

---

## Origin

Meridian started from a manually produced NationGraph memo that earned GP sourcing credit on first send. The ask was simple: automate that quality at deal velocity. Meridian is that automation — built for throughput, not analyst time savings.

---

## License

Private — all rights reserved.
