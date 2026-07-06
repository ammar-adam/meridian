# EverTrace Research — Stealth Founder Discovery

Research date: 2026-07-03. Context: Panache Ventures (Inshaal) flagged EverTrace during a live call as a promising lead for stealth founder discovery via domain registrations, research papers, and Product Hunt launches. This spike verifies what EverTrace actually offers before committing API credits or a paid account.

## What EverTrace Actually Surfaces

EverTrace ([evertrace.ai](https://evertrace.ai/)) is a **founder detection engine**, not a general company database. It monitors real-time primary signals and triangulates individuals across sources before publishing a record.

**Confirmed signal types** (from product and API marketing pages):

| Signal | Verified | Notes |
|--------|----------|-------|
| Domain registrations | Yes | Links new domains to individuals and prior ventures |
| Company/trade registry filings | Yes | Core stealth signal — incorporation before public launch |
| GitHub activity | Yes | Repos and technical behavior without public company |
| Patent filings | Yes | Deep-tech / spinout detection |
| Government research grants | Yes | Academic-to-founder transition |
| Research paper publications | Partial | Described as "academic research" tracking; not explicitly named "papers" on pricing page but aligned with grant/research monitoring |
| Product Hunt launches | **Not confirmed** | Not listed on current marketing pages reviewed; may exist in platform filters but **not** a headline signal in 2026 site copy |

**Correction vs. Panache call notes:** Domain registrations and incorporation filings are accurate and central. Research publications and grants are covered under academic/research monitoring. Product Hunt was **not verified** in public documentation during this spike — treat as unconfirmed until demo/API docs show it.

## Pricing

- **No public price list.** Both "Platform plan" and "API plan" show **"Get quote"** on [evertrace.ai/pricing](https://www.evertrace.ai/pricing).
- API access requires booking a demo for a tailored quote.
- API plan includes: full raw signal access, historical export, flexible rate limits, dedicated technical support, plus all platform sourcing features.

**Estimate for planning:** Budget as enterprise SaaS ($500–2,000+/mo range typical for VC data APIs at this tier) but **must confirm via demo** before sprint planning.

## Geography / Canadian Coverage

- Platform plan explicitly lists **"Access to all geographies"** on the pricing page.
- A customer testimonial mentions improved founder ID **"particularly in countries outside our core markets"** — suggests non-US coverage exists.
- Data sources include **official company registries** and public records globally; EverTrace claims continuous addition of unconventional sources.
- **Canadian-specific filtering:** API supports the **same filters as the platform** (per API FAQ). Geography filtering is likely available but **Canadian signal density vs. US is unverified** without a trial. This is the critical open question for Panache — Canada's structural data gap may persist even with "all geographies" access.

## API Details

- **Type:** RESTful JSON API with pagination ([evertrace.ai/api-access](https://www.evertrace.ai/api-access))
- **Auth:** Bearer token (issued after API plan enabled)
- **Freshness:** Continuous updates as signals are ingested (mirrors platform)
- **Rate limits:** Daily limits enforced; adjustable on API plan
- **Also offers:** MCP server for AI assistant integration (Claude, ChatGPT)

## Rate Limits and Data Freshness

- Continuous ingestion; timestamps on records for last verification.
- Daily request limits on API (exact numbers require contract).
- No free tier or self-serve API key found.

## Recommendation for Next Sprint

**Conditional go — book a demo, do not integrate blindly.**

EverTrace is the strongest lead identified for Panache's stealth-founder problem: it directly targets pre-announcement signals (registry + domain + technical activity) rather than post-formation databases like PitchBook or Specter. The API is real and designed for embedding into internal tools — a good fit for Meridian's Discover layer as a distinct **"Stealth signal — unverified"** source type.

**Blockers before full integration:**

1. Confirm **Canadian registry/domain signal volume** in a demo (not just "all geographies" marketing).
2. Confirm **Product Hunt** coverage if that signal matters to the fund.
3. Obtain **pricing** and rate limits for batch Discover queries.
4. Validate signal freshness latency (hours vs. days) for domain registrations.

If the demo confirms reasonable Canadian coverage, proceed with wiring `lib/evertrace.js` into `/discover` as a supplemental seed source with clear unverified labeling. If Canadian density is thin, document as a US-first tool like Harmonic/Specter and deprioritize for Meridian's Canadian wedge.

**This sprint:** scaffolding only (`lib/evertrace.js`). No API credits spent.
