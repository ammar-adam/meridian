# Meridian — agents.md

## What is Meridian

Meridian is an AI-powered investment memo generator for venture capital firms.
A user pastes a company URL. The system scrapes the website, runs deep research
via Perplexity, synthesizes everything through Claude, and returns a beautiful
one-page PDF research brief in under 90 seconds.

The output quality target is the NationGraph Watch Memo in this repo. That memo
was manually produced and got sourcing credit from the GP of a $150M AI fund at
Sagard Holdings, who immediately asked how it could be automated. Meridian is
the answer to that question.

The value prop is deal velocity. Not saving analyst time. Letting a fund look
at 3x more companies per week without adding headcount.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 app router + Tailwind | Fast to build, easy deployment |
| Scraping | Native fetch + regex, server-side | No heavy deps, works for og:image extraction |
| Research | Perplexity API (sonar-deep-research) | Best web research quality for company intel |
| Synthesis | Anthropic API (claude-sonnet-4) | Structured JSON output, strong instruction following |
| Template | HTML with {{VARIABLE}} string replace | Simple, predictable, easy to iterate on design |
| PDF | Browser print for now, Playwright on Railway later | Ship fast, add render later |

---

## File Structure

```
meridian/
├── app/
│   ├── page.jsx                  # URL input frontend, triggers pipeline
│   ├── memo/
│   │   └── page.jsx              # memo renderer using dangerouslySetInnerHTML
│   └── api/
│       ├── scrape/
│       │   └── route.js          # server-side: fetches URL, extracts og:image,
│       │                         # og:title, og:description, favicon
│       ├── research/
│       │   └── route.js          # calls Perplexity sonar-deep-research
│       └── generate/
│           └── route.js          # calls Claude, returns populated JSON
├── lib/
│   ├── nationgraph-data.js       # hardcoded demo data, used as fallback
│   ├── system-prompt.js          # Claude system prompt
│   ├── template-renderer.js      # string replace utility: replaces {{VARS}}
│   └── types.js                  # MemoData schema (for reference, not enforced)
├── public/
│   └── memo-template.html        # the HTML template, never edit variables here
├── agents.md                     # this file
├── prd.md                        # product requirements
├── cursor-prompt.md              # full build instructions for cursor
└── .env.local                    # ANTHROPIC_API_KEY, PERPLEXITY_API_KEY
```

---

## How the Pipeline Works

```
1. User pastes URL into app/page.jsx

2. /api/scrape
   - Fetches the company website server-side
   - Extracts: og:image, og:title, og:description, favicon, domain
   - Returns JSON. og:image becomes HERO_IMAGE_URL in the memo.

3. /api/research
   - Calls Perplexity sonar-deep-research with the URL
   - Query covers: product features, market size, team backgrounds,
     funding history, defensibility, recent news
   - Returns raw research text

4. /api/generate
   - Sends Perplexity output + scraped data + fund context to Claude
   - System prompt instructs Claude to return ONLY valid JSON
   - JSON keys map exactly to {{VARIABLE}} names in memo-template.html
   - Returns parsed memoData object

5. app/memo/page.jsx
   - Reads memoData from sessionStorage (or falls back to nationgraphData)
   - Calls renderMemo(data) from lib/template-renderer.js
   - renderMemo reads memo-template.html, does replaceAll for every key
   - Renders result via dangerouslySetInnerHTML at 210mm width
```

---

## Template Variable Reference

Every `{{VARIABLE}}` in memo-template.html must be populated. Full list:

**Header / Hero**
- `COMPANY_NAME` — display name of the company
- `COMPANY_INITIAL` — first letter, used in fallback avatar
- `COMPANY_TAGLINE` — one line, lowercase, what they do
- `COMPANY_LOGO_URL` — scraped or empty string (fallback renders initials)
- `FUND_NAME` — name of the reviewing fund
- `FUND_LOGO_URL` — fund logo or empty string
- `HERO_IMAGE_URL` — og:image from scraper, used as header background
- `ROUND` — funding stage e.g. "Series A"
- `DATE` — current month and year e.g. "June 2026"

**Product**
- `PRODUCT_DESCRIPTION` — 3-5 sentences, specific features, `<strong>` on product names

**Market**
- `MARKET_DESCRIPTION` — 3-4 sentences with TAM figure
- `STAT_1_VALUE`, `STAT_1_LABEL` — e.g. "$160B" / "Annual state & local IT spend"
- `STAT_2_VALUE`, `STAT_2_LABEL`
- `STAT_3_VALUE`, `STAT_3_LABEL`

**Defensibility**
- `DEFENSE_1_TITLE`, `DEFENSE_1_TEXT`
- `DEFENSE_2_TITLE`, `DEFENSE_2_TEXT`

**Team**
- `TEAM_1_INITIALS`, `TEAM_1_ROLE`, `TEAM_1_NAME`, `TEAM_1_BIO`
- `TEAM_2_INITIALS`, `TEAM_2_ROLE`, `TEAM_2_NAME`, `TEAM_2_BIO`
- `TEAM_3_INITIALS`, `TEAM_3_ROLE`, `TEAM_3_NAME`, `TEAM_3_BIO`

**Portfolio Fit**
- `PORTFOLIO_INTRO` — 1-2 sentences on fit
- `PORTFOLIO_ITEMS` — HTML string of portfolio-item divs

**Thesis Band (bottom red section)**
- `FUND_ANGLE_LABEL` — "The [Fund Name] Angle"
- `THESIS_HEADLINE` — declarative statement, fund-specific
- `THESIS_1_TITLE`, `THESIS_1_TEXT`
- `THESIS_2_TITLE`, `THESIS_2_TEXT`
- `THESIS_3_TITLE`, `THESIS_3_TEXT`

---

## Key Rules for Agents

**Never do these:**
- Do not use client-side fetch for scraping. All scraping is server-side in API routes.
- Do not hardcode API keys. Only `process.env.ANTHROPIC_API_KEY` and `process.env.PERPLEXITY_API_KEY`.
- Do not install Cheerio, Puppeteer, or any scraping library. Native fetch + regex only.
- Do not add auth, databases, or user accounts. That is v2.
- Do not add features not in prd.md. Focus on the core loop.
- Do not touch memo-template.html CSS unless something is visually broken.
- Do not skip steps. Step 1 must look right before Step 2 is built.

**Always do these:**
- The memo page renders at exactly 210mm wide. This is an A4 PDF constraint.
- Claude must return valid JSON only. The system prompt is strict about this.
- If Claude's response fails JSON.parse, attempt to extract JSON with a regex match before returning an error.
- The `/memo` page must always render something. Fall back to nationgraphData if sessionStorage is empty.
- Log API responses during development so failures are visible.

---

## Fund Context

For v1 the fund context is hardcoded for Sagard. When multi-fund support is
added, this becomes a database lookup by fund slug.

```js
export const SAGARD_CONTEXT = {
  fundName: "Sagard AI Fund",
  thesis: `Sagard is a multi-strategy alternative asset manager with funds across
  venture (Portage), growth equity (Diagram), private credit, and Power Corp
  operating companies including Great-West Lifeco and IGM Financial. The AI Fund
  focuses on commercial-stage AI companies that can be deployed as commercial
  pilots across the Sagard portfolio ecosystem. Key portfolio companies include
  Benepass, KidKare, Ansel Health, Xceedance (Portage), Lyteflo, Novisto
  (Diagram). Strong preference for companies with enterprise distribution
  advantages and data moats. Canadian expansion is a recurring plus.`
}
```

---

## Current Build Status

- [x] Step 1: memo/page.jsx renders NationGraph data correctly in browser
- [x] Step 2: scrape route returns og:image and og:description for any URL
- [x] Step 3: research route returns Perplexity output for any URL
- [x] Step 4: generate route returns populated JSON from Claude
- [x] Step 5: full pipeline works end to end, URL in, memo renders

## V2 Improvements

- [x] Improvement 1: Rich Sagard fund context + buildSystemPrompt for thesis band
- [x] Improvement 2: Quality gates before render (warnings banner, error blocking)
- [x] Improvement 3: Parallel scrape + research with step loading UI + 90s timeout
- [x] Improvement 4: URL normalization, industry hero fallback via INDUSTRY_TAG
- [x] Improvement 5: Memo library in localStorage with home page drawer
- [ ] Improvement 6: Playwright PDF route (TODO in app/api/generate/route.js)

## V3 — Behavioral Data Layer

- [x] Inline editing on memo fields (data-field + contenteditable)
- [x] Pursue/Pass signal with undo
- [x] Edit tracker (lib/edit-tracker.js) — localStorage, thesis edit flagging
- [x] Internal insights page at /insights (not linked from main UI)
- [x] Edit persistence to sessionStorage + memo library upsert by memoId
- [x] Prompt feedback export (lib/prompt-feedback.js) on /insights
- [x] API health check (/api/health) with home page warning

Check off each step before moving to the next.

---

## Definition of Done for V1

Open the app. Paste any well-documented Series A company URL. Click Generate.
See a memo that looks like the NationGraph PDF within 90 seconds.
