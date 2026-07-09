# Meridian — agents.md

## What is Meridian

Meridian is a thesis-native deal screening system for investment firms.
Configure your fund once, then Discover companies against your mandate,
Brief them into forwardable one-pagers, and learn from every edit and pursue/pass.

Brief output targets mandate-specific thesis bands — structured one-pagers investment teams can forward.

The value prop is deal velocity. Not saving analyst time. Letting a fund look
at 3x more companies per week without adding headcount.

---

## Product Loop

```
Fund setup (/fund/setup) → Discover → Brief → Library → Thesis
```

| Workspace | Route | Purpose |
|---|---|---|
| **Discover** | `/discover` | Thesis → PitchBook + Perplexity → ranked companies |
| **Brief** | `/brief` | URL → scrape → research → one-page brief |
| **Library** | `/library` | Saved briefs with outcomes |
| **Thesis** | `/thesis` | Pursue rate, thesis corrections, fund learning |
| **Fund** | `/fund` | Fund profile (thesis, portfolio, branding) |

Legacy redirects: `/source` → `/discover`, `/app` → `/brief`, `/insights` → `/thesis`

---

## Architecture Layers

| Layer | Route | Pipeline |
|---|---|---|
| **L1 Brief** | `/brief` | URL → scrape → research → memo |
| **L2 Discover** | `/discover` | Thesis → PitchBook + Perplexity → ranked companies → batch brief |
| **L3 Thesis** | `/memo` + `/thesis` | Inline edits, pursue/pass → behavioral learning |

---

## Fund Profile (firm-agnostic)

Stored in `localStorage` via `lib/fund-profile.js`. Required before workspace use.
Auto-enrich via `/api/fund-enrich` (scrape fund site + Perplexity + Claude).

No hardcoded fund branding.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 app router + Tailwind |
| Scraping | Native fetch + regex, server-side |
| Research | Perplexity API — multi-pass brief research (`lib/research-passes.js`); sonar (quick) / sonar-deep-research (deep) |
| Synthesis | Anthropic API (claude-sonnet-4) |
| Sourcing | PitchBook API (optional) + Perplexity + Claude ranking |
| Template | HTML with {{VARIABLE}} string replace |
| PDF | Server Playwright (`/api/pdf`) when `MERIDIAN_ENABLE_SERVER_PDF=true`; browser print fallback |

---

## File Structure

```
meridian/
├── app/
│   ├── page.jsx              # Landing (thesis-first hero)
│   ├── discover/page.jsx     # Thesis sourcing workspace
│   ├── brief/page.jsx        # URL → brief workspace
│   ├── library/page.jsx      # Saved briefs
│   ├── thesis/page.jsx       # Fund learning dashboard
│   ├── fund/page.jsx         # Fund profile editor
│   ├── fund/setup/page.jsx   # Onboarding wizard
│   ├── memo/page.jsx         # Brief viewer (editable, pursue/pass)
│   └── api/
│       ├── scrape/route.js
│       ├── research/route.js
│       ├── generate/route.js
│       ├── source/route.js
│       └── fund-enrich/route.js
├── lib/
│   ├── fund-profile.js       # Fund CRUD (localStorage)
│   ├── memo-pipeline.js      # Client brief pipeline
│   ├── batch-runner.js       # Batch jobs (lists, discover)
│   ├── outcome-sync.js       # GP outcomes → library
│   ├── thesis-parser.js
│   ├── pitchbook.js
│   ├── source-prompt.js
│   ├── edit-tracker.js
│   ├── outreach-prompt.js    # Founder outreach synthesis
│   ├── evertrace.js          # Stealth signal scaffold (Discover)
│   ├── canada-registry.js    # Corporations Canada CSV snapshot
│   ├── domain-check.js       # Free DNS/HTTP domain probe
│   ├── sourcing/             # Multi-source adapters + entity resolution
│   ├── fund-seeds.js         # Demo fund profiles (Sagard, Panache)
│   ├── memo-template.js      # Template variant IDs
│   ├── research-passes.js    # Section-specific Perplexity passes + confidence
│   ├── research-core.js      # Parallel research orchestrator
│   └── quality-gate.js
├── components/
│   ├── workspace-shell.jsx
│   ├── fund-profile-form.jsx
│   ├── outreach-drawer.jsx
│   └── source-table.jsx
└── public/templates/
    ├── default.html          # Standard one-pager (hero image)
    └── compact.html          # Text-forward dense layout
```

---

## Shipped Features (Panache Sprint)

| Feature | Route / file | Notes |
|---------|--------------|-------|
| **Multi-fund profiles** | `lib/fund-profile.js`, fund switcher in workspace shell | Multiple funds in localStorage; active fund + strategy context |
| **Founder outreach drafts** | `/memo` → Draft outreach, `app/api/outreach` | After Pursue; Claude synthesis from brief + fund context; edits logged as `section: outreach` |
| **Memo template variants** | `public/templates/`, fund setup selector | `default` and `compact`; per-fund `memoTemplateId` |
| **EverTrace research** | `docs/evertrace-research.md`, `lib/evertrace.js` | Scaffold only; conditional go pending Canadian coverage demo |
| **Multi-source data layer** | `lib/sourcing/`, `docs/meridian-vision.md`, `docs/data-sourcing-wedge-vision.md` | Domain registry, Velocity cohorts, IRAP grants, entity resolution |
| **Multi-pass brief research** | `lib/research-passes.js`, `lib/research-core.js` | Quick: 3 parallel passes (product, funding, team); Deep: 6; team escalation when thin; confidence → quality gate |

---

## Brief Research Architecture

```
/api/research → research-core.js
  Quick/auto: 3 parallel Perplexity (sonar) passes — product, funding, team
  Deep:       6 parallel Perplexity (sonar-deep-research) passes
  Team thin:  +1 escalation pass (LinkedIn/Crunchbase/press)
  → passes[] with confidence: found | partial | not_found
  → /api/generate receives researchPasses + merged research string
  → Claude returns CONFIDENCE_SUMMARY (stripped before render)
  → quality gate surfaces section-specific verify banners on /memo
```

Instant mode skips Perplexity (scrape-only via `lib/instant-research.js`).

---

## Key Rules for Agents

**Never do these:**
- Do not hardcode fund-specific branding (no Sagard defaults in runtime paths)
- Do not use client-side fetch for scraping
- Do not hardcode API keys in source
- Do not install Cheerio, Puppeteer, or scraping libraries
- Do not touch memo-template.html CSS unless visually broken

**Always do these:**
- Memo page renders at exactly 210mm wide
- Fund profile optional — guest context default; configure at `/fund/setup` when ready
- Thread sourceContext from Discover through to /api/generate
- `/memo` shows empty state when sessionStorage has no brief
- Log API responses during development

---

## Environment Variables

```
ANTHROPIC_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
PITCHBOOK_API_KEY=your_key_here   # optional
```

---

## Current Build Status

- [x] V1: URL → memo pipeline
- [x] V2: Quality gates, parallel pipeline, memo library, industry hero fallback
- [x] V3: Behavioral tracking, pursue/pass, thesis dashboard
- [x] Thesis-first rebuild: Discover/Brief/Thesis nav, fund profile, batch briefing
- [x] Server PDF route (`/api/pdf` via Playwright + `@sparticuz/chromium-min` on Vercel)
- [x] Multi-fund profiles with fund switcher and per-fund outreach tone
- [x] Founder outreach draft generator from Pursue'd memos
- [x] Per-fund memo template variants (`default`, `compact`)
- [x] Multi-pass brief research with per-section confidence tracking

---

## Definition of Done

1. Fresh install → fund setup → Discover run → no hardcoded fund strings
2. Brief from Discover carries search thesis into memo thesis band
3. Batch brief 3+ companies without leaving Discover
4. Thesis tab shows pursue rate after outcomes logged
