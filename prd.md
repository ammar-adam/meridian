# Meridian — Product Requirements Document
**Version:** 0.3  
**Author:** Ammar Adam  
**Date:** June 2026  
**Status:** Thesis-first rebuild shipped

---

## The Origin

A manually produced investment memo on NationGraph was sent cold to the GP of
Sagard's new $150M AI Fund. He reacted positively, gave sourcing credit, and
immediately asked: "How did you generate the one pager?" and "I need to use
agents for memo creation and population."

That exchange is the entire product thesis. A GP saw the output and independently
asked for the automation. Meridian is the automation.

---

## Problem

Every time an investor hears about a company worth looking at, someone has to
spend 30-90 minutes doing first-pass research: reading the website, finding the
funding history, researching the founders, checking for portfolio overlap, then
formatting all of it into the same template they always use.

This happens hundreds of times per year at every fund. Most companies get passed
on. Most of that research time was wasted. The output is always the same structure.

There is no tool that automates this well. Generic AI assistants were not built
for this workflow. Notion AI and ChatGPT produce output that still requires
significant cleanup. An analyst is expensive and synchronous.

The actual cost is not analyst hours. It is deals not looked at. A fund that can
evaluate 3x more companies per week has a structural sourcing advantage.

---

## Solution

Thesis-native deal screening for investment firms.

**Primary loop:** Configure fund → Discover companies by thesis → Brief the best matches → Learn from edits and pursue/pass.

**Secondary loop:** Paste a company URL → get a mandate-specific one-page brief in under 90 seconds.

The output covers:
- What the company does in plain english
- Market size with specific numbers
- Founder backgrounds and prior exits
- Funding history and lead investors
- Defensibility: moats and switching costs
- Thesis fit: why this specific fund should care

The analyst reads it in 60 seconds and decides whether to pursue or pass.
If yes, they go deeper. If no, they move on. Either way they did not spend
45 minutes getting there.

---

## What Makes This Different

Every other AI research tool stops at the generic summary. Market size, team,
funding. That is commodity output.

The section that made the NationGraph memo land was the last one: why this fund
specifically should care. Portfolio overlap, distribution paths, mandate fit.

Meridian generates that section from each firm's configured profile (thesis +
portfolio). Auto-enrich pulls draft context from the fund website + web research.
Every pursue/pass signal and thesis edit sharpens the model over time.

That thesis intelligence layer is the moat. Not memo generation. The fund-specific
signal that gets more accurate with usage and cannot be transferred to a competitor.

---

## Target Users

**Primary:** Analysts and associates at VC and growth equity firms, 2-50 person shops.
The person who does first-pass research before a GP looks at something.

**Secondary:** Solo GPs and angels without analyst support. The person who heard
about a company at a dinner and wants to know if it is worth pursuing before
they forget.

**Later:** PE sourcing teams, corporate development, family offices, investment banks.
Bigger budgets, more process, stronger willingness to pay. But VC is the right
starting point because the feedback loop is faster and Evan is right there.

The buyer is the firm. The user is whoever does the research. The decision maker
is a GP or Chief of Staff, not an IT department.

---

## V1 Scope

Thesis-first deal screening. Firm-agnostic fund profile.

| Feature | Description |
|---|---|
| Fund profile | Setup wizard + auto-enrich from fund URL; thesis + portfolio in localStorage |
| Discover | Natural language thesis → PitchBook + Perplexity → ranked company table |
| Batch brief | Select companies from Discover → sequential brief generation → Library |
| Brief | Paste any company URL to trigger the pipeline |
| File upload | Optional: attach a deck PDF or news articles as additional context |
| Web scraper | Server-side fetch of company website, extracts og:image for hero, og:description for context |
| Research pipeline | Perplexity sonar-deep-research for raw company intel |
| Synthesis | Claude sonnet-4 structures Perplexity output into memo JSON |
| HTML template | One opinionated template. No custom branding per firm in v1. |
| PDF export | Browser print for now. Playwright on Railway in v1.5. |
| Empty memo state | /memo shows empty state when no brief is loaded |
| Thesis dashboard | Pursue rate, thesis corrections, pursue/pass log at /thesis |

**Explicitly out of scope:**
- Auth and user accounts
- Multi-fund selector
- CRM connectors
- Server-side batch API
- Mobile layout

---

## Memo Output Structure

```
Header:        Hero image (og:image from company website)
               Company name + logo | Fund name | Round · Date
               Tagline (AI-generated, one line, lowercase)

Section 1:     Product
               3-5 sentences. What they actually do. Specific features named.

Section 2:     Market
               3-4 sentences + 3 stat callouts (TAM, key metric, funding)

Section 3:     Defensibility
               Two named moats with 2-3 sentence descriptions each

Section 4:     Team
               3 people: initials avatar, role, name, 1-2 sentence bio

Section 5:     Portfolio Fit
               1-2 sentence intro + grid of overlapping portfolio companies

Footer band:   The [Fund] Angle
               Declarative headline + 3 fund-specific thesis points

Footer:        Confidential · Prepared by [Fund] · Date
```

The thesis band at the bottom is the differentiator. Everything above it is
commodity research any tool can approximate. The fund-specific angle is what
gets this used.

---

## Research Pipeline Architecture

```
Input: Company URL + optional uploaded files

Step 1 — Scraper (app/api/scrape)
  Server-side fetch of company website
  Extracts: og:image → HERO_IMAGE_URL
            og:title → company name confirmation
            og:description → product context signal
            favicon → fallback logo

Step 2 — Perplexity (app/api/research)
  Model: sonar-deep-research
  Query covers: product features, market size, team backgrounds,
  funding history, defensibility, recent news and milestones
  Returns: raw research text

Step 3 — Claude (app/api/generate)
  Model: claude-sonnet-4
  Input: Perplexity output + scraped data + fund context
  Output: structured JSON with every {{VARIABLE}} populated
  System prompt enforces: specific language, no filler,
  fund-specific thesis section, valid JSON only

Step 4 — Template render (app/memo/page.jsx)
  Reads memo-template.html
  String replaces every {{VARIABLE}} with JSON values
  Renders via dangerouslySetInnerHTML at 210mm width

Step 5 — PDF
  V1: browser print (cmd+P → Save as PDF)
  V1.5: Playwright headless render on Railway for pixel-perfect output
```

**Cost per memo:** ~$0.15-0.35 total across Perplexity + Claude.
Negligible at beta scale. Margin is fine even at $99/mo pricing.

---

## Fund Thesis Learning (Post-V1)

V1 hardcodes Sagard context. V2 automates thesis capture:

**Signal sources:**
- Portfolio pages (what they own, what stage, what sector)
- Why-we-invested memos (language patterns, what they emphasize)
- Partner blog posts and essays (thesis language in their own words)
- Press coverage of their investments (what got called out as differentiated)
- Recency weighting (2024 investments matter more than 2019 investments)

**Revealed preference layer (V3):**
Every time a user marks a deal pursue or pass, the model updates. After 6 months
of usage the system knows what this fund actually bets on from behavior, not
stated thesis. This is not something a competitor can replicate without the
same usage data.

This is the retention mechanism. Not features. Behavioral lock-in.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 app router + Tailwind | Fast to build, Vercel deployment |
| Auth | None in v1 | Ship faster, add Clerk in v2 |
| Database | None in v1 | sessionStorage for memo state |
| Scraping | Native fetch + regex | No heavy dependencies |
| Research | Perplexity API (sonar-deep-research) | Best coverage for company intel |
| Synthesis | Anthropic API (claude-sonnet-4) | Strong JSON instruction following |
| PDF render | Browser print (v1), Playwright on Railway (v1.5) | Incremental complexity |
| Logo/hero | og:image scraped from company site | Works for all companies with websites |
| Deployment | Vercel (frontend) | Zero config |

---

## Build Sequence

**Day 1**
Memo template renders perfectly in browser with hardcoded NationGraph data.
The output looks identical to the NationGraph PDF. This sets the quality bar.
Nothing else matters until this is true.

**Day 2**
Claude API wired. Takes hardcoded Perplexity-style research text, returns JSON,
populates template. Pipeline works without actually calling Perplexity yet.

**Day 3**
Scraper and Perplexity wired. Full pipeline live: paste nationgraph.com, get
a populated memo. Test on 3-4 other well-documented companies.

**Week 2**
Sagard thesis context hardcoded and refined. Test the thesis band specifically:
does it generate output Evan would recognize as accurate to Sagard's mandate?
Fix the system prompt until it does.

**Week 3-4**
Test on 10+ companies across stages. Find the failure modes: thin web presence,
unusual company structures, international companies. Document what breaks.

**End of July**
Demo to Evan on a real deal he is actively looking at. Not a rehearsed demo.
A live URL he cares about.

---

## Monetization

**Beta (now through September 2026):** Free. Invite only. Target 5-10 firms.
Sagard is the anchor. Every other firm comes from Sagard's network or warm intro.

**Post-beta pricing:**

| Tier | Price | Seats | Memos | Notes |
|---|---|---|---|---|
| Starter | $99/mo | 1 | 20/mo | For solo angels and small funds |
| Team | $299/mo | 5 | Unlimited | For associate-level teams |
| Firm | $799/mo | Unlimited | Unlimited | CRM connectors, priority support |

Annual contracts at 20% discount. Sagard as first paying customer at Team or
Firm tier. Target: 5 paying firms by Q1 2027.

---

## Exit / Acquisition Path

The thesis intelligence layer — not the memo generation — is the acquisition
target. Affinity and DealCloud both have deep VC CRM relationships and would
acquire a fund-specific intelligence layer that improves with usage.

The pitch to an acquirer is not "we generate memos." It is "we have 6 months
of pursue/pass behavioral data from 20 real funds that teaches you exactly how
each fund thinks about deals." That is not replicable from a standing start.

Target acquisition conversation: 2027, after meaningful usage data exists.
Target acquirer: Affinity (primary), DealCloud or Attio (secondary).
Target range: $500K-$2M at sub-$100K ARR, higher with meaningful usage data.

---

## Open Questions

1. How thin is Perplexity coverage on pre-seed companies with minimal web presence?
   Need to test on 5+ obscure seed-stage companies before showing Evan.

2. Does the thesis fit section need human review before it is trustworthy?
   First version should be reviewed manually before going live.

3. Is Sagard IT comfortable with deal data flowing through external infrastructure?
   Relevant if pitching internally as a Sagard tool. Less relevant for standalone product.

4. Do we build the fund profile scraper before beta launch or manually seed
   the top 20 VC funds and iterate from there?

5. What is the right fallback for companies where og:image returns nothing useful?
   Options: Unsplash query based on industry, solid color from brand palette, blank.

---

## Name

**Meridian.** Feels like infrastructure. Implies orientation and finding true
north on a deal. A GP would say "just run it through Meridian" without it
sounding like a feature name. No AI, memo, research, or deck in the name.
