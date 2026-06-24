# Meridian Setup Guide

## Prerequisites

- Node.js 18+
- npm
- API keys: Anthropic, Perplexity (required). PitchBook (optional, improves Discover).

---

## 1. Install

```bash
cd meridian
npm install
```

---

## 2. Environment variables

Create or edit `.env.local` in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
PITCHBOOK_API_KEY=...          # optional — Discover works without it (web-only)
```

Restart the dev server after changing keys.

Check keys are loaded:

```bash
# With dev server running:
curl http://localhost:3000/api/health
```

Expected: `"anthropic": true`, `"perplexity": true`, `"pitchbook": true/false`.

---

## 3. Run locally

```bash
npm run dev
```

Open **http://localhost:3000**

---

## 4. First-time setup (required)

Meridian is firm-agnostic. You must configure a fund before using the workspace.

1. Click **Open workspace** or go to **http://localhost:3000/fund/setup**
2. Enter **Fund name** and **Fund website** (e.g. `acme.vc`)
3. Click **Auto-enrich from website** (optional) — drafts thesis + portfolio from scrape + web research
4. Edit thesis and portfolio rows as needed
5. Click **Save & enter workspace**

Profile is stored in browser `localStorage` (`meridian_fund_profile`). Same browser only until backend sync exists.

---

## 5. Core workflows

### Discover (primary)

1. Go to **/discover**
2. Enter a search thesis (e.g. `AI infrastructure for financial services, Series A, North America`)
3. Click **Run discover pipeline** (~60–90s)
4. Filter results by stage / geo / sector
5. Actions:
   - **Brief →** on one row → opens Brief and auto-generates
   - **Brief selected (N)** or **Brief top 5** → batch queue, saves to Library without leaving page

### Brief (secondary — already have a URL)

1. Go to **/brief** or use landing **Already have a company?**
2. Paste company URL → **Generate brief** (~90s)
3. Review memo → edit inline → **Pursue** or **Pass**

### Library

**/library** — all saved briefs with outcome and edit count. Click **Open** to revisit.

### Thesis

**/thesis** — pursue rate, thesis corrections, pursue/pass log. Populates after you review memos and log outcomes.

### Fund settings

**/fund** — edit thesis, portfolio, re-run auto-enrich anytime.

---

## 6. Without API keys

- **/memo** with no saved brief shows an empty state (no demo data)
- Discover, Brief, and fund auto-enrich **require** real Anthropic + Perplexity keys

---

## 7. Deploy (Vercel)

1. Push repo to GitHub
2. Import in Vercel
3. Add env vars: `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `PITCHBOOK_API_KEY`
4. Deploy

`vercel.json` sets timeouts: research 300s, source 300s, generate 120s. Vercel **Pro** recommended for long research calls.

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| Redirected to `/fund/setup` on every visit | Complete fund setup; need `fundName` + `thesis` saved |
| `ANTHROPIC_API_KEY is not configured` | Replace `your_key_here` in `.env.local`, restart dev server |
| Discover returns few companies | Add PitchBook key; or broaden thesis |
| Batch brief slow / times out | Brief 1–2 at a time first; each company ~90s |
| Thesis tab empty | Generate briefs, open memos, click Pursue or Pass |
| Old routes | `/source` → `/discover`, `/app` → `/brief`, `/insights` → `/thesis` |

---

## 9. Evan demo checklist

1. Fund setup with real fund context (or manual thesis + 3–5 portcos)
2. One live Discover run on a thesis Evan cares about
3. Brief **one** company — check thesis band before batching
4. Forward test: would GP send without editing thesis section?
5. Pursue/pass on 2+ memos → show **/thesis** pursue rate

---

## Route map

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/fund/setup` | First-run onboarding |
| `/discover` | Thesis → ranked companies |
| `/brief` | URL → one-pager |
| `/library` | Saved briefs |
| `/thesis` | Fund learning dashboard |
| `/fund` | Edit fund profile |
| `/memo` | Brief viewer + pursue/pass |
