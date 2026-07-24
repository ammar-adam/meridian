# Meridian — Product Vision & Strategic Context

## Purpose of This Document

Every build prompt so far has scoped a specific sprint. None of them explain
*why* the product is shaped this way, which means each new feature request
can look like scope creep instead of a coherent strategy. This document is
the missing context: read this before any sprint prompt to understand how
individual features connect to the actual thesis of the product.

This is not a build spec. It contains no code. It exists so that every
future build decision can be checked against a single question: does this
serve the actual wedge, or is it just a feature that sounded good in the
moment.

**Related:** [data-sourcing-wedge-vision.md](./data-sourcing-wedge-vision.md) (data layer GTM),
[mentor-send-package.md](./mentor-send-package.md) (honest mentor claims + staging URLs).

---

## Vision spine (near-term vs long-run)

| Horizon | Claim | Status |
|---------|--------|--------|
| **Near-term product** | School ecosystems → fund mandates: dated, sourced campus companies matched to what a firm actually invests in | Shipped / demoing on Meridian Staging |
| **Coverage wedge (not brand tagline)** | Tier-1 Canada / US / UK first; emerging schools expand over time | Near-term coverage priority — do **not** lead marketing as “we cover all Tier-1” |
| **Infrastructure (not the pitch)** | Agents, scrapers, coverage crons, brief→graph write-back | How coverage compounds; **not** “AI agent platform” |
| **Trust over AI guesswork** | Dated incubator / cohort provenance ranks above unverified `university_scout` | Shipped ranking preference |
| **Identity** | Sign in → claim firm (fund / FO / angel / company); firm-agnostic; no default demo fund hero | Staging behavior as of 2026-07-24 |
| **Demo honesty** | Deal velocity with receipts; only claim what we can date and source | Mentor / film hard don’ts |
| **Long-run (not current product)** | Failed / former founders → VC talent programs (portfolio hiring, fellowships, scout/operator pipelines) | Vision only — do not implement or pitch as shipped |

Preferred fictional demo identity going forward: **Meridian Ventures** (or similar fictional FO). Named real funds may appear as optional seed kits only — never as the hero of the vision or the default claimed firm.

---

## The Origin, Restated Plainly

A manually written investment memo on NationGraph, built using Claude with
no automation, got sourcing credit from a GP at an AI-focused fund. He didn't
just like the output. He asked, unprompted, how it was generated and whether
it could be automated. That single reaction is the entire reason this
product exists. Everything since has been trying to figure out what the
real, defensible version of "automate that" actually looks like.

---

## The Reframes, and Why Each One Was Correct

The product's framing has shifted over the course of building it.
Each shift was not abandoning the previous idea — it was discovering that
the previous idea was one layer of a larger, more accurate picture.

**Reframe 1 — URL in, memo out.**
The starting point. Solves a real, narrow problem: first-pass research takes
30-90 minutes and produces a document with the exact same shape every time.
Automating that shape is genuinely useful, but it is also the most
replicable layer of the product. Anyone with API keys and a weekend can
build this. This is the floor, not the moat.

**Reframe 2 — Thesis-native screening.**
The insight that memo generation alone is commodity, but *why this specific
firm should care* is not. The thesis band — fund-specific reasoning on the
memo — is what made the original NationGraph memo land. Generic research any
tool can produce; mandate-specific judgment requires knowing the firm. This
reframe correctly identified WHERE the value lives in the output, but not
yet where the value lives in the process of getting there.

**Reframe 3 — Sourcing as the wedge, not just briefing.**
Independent conversations with early-stage fund operators and allocators
converged on the same point: the hard problem isn't writing up a company
once you've found it, it's finding the company in the first place. Existing
tools (Harmonic, Spectre, PitchBook) solve this for the US market and treat
Canada, and small/early-stage deal flow generally, as an afterthought. This
reframe correctly identified that Meridian was solving the easier half of
the problem and ignoring the harder, more defensible half.

**Reframe 4 — Geographic and community fragmentation as the actual data
problem.**
Early-stage deal flow isn't centrally indexed; it lives across university
venture ecosystems, incubator cohorts, grant recipient lists, and small
community events — few of which publish an API. Trust and access inside those
communities matter more than another synthesis layer on the same public APIs.
This reframe explained why thesis bands and Discover stayed thin when fed
only StartupHub and generic web search.

**Reframe 5 — School ecosystems → fund mandates (current product thesis).**
The crisp near-term expression of Reframes 3–4: connect **campus ecosystems**
to **fund / FO / angel mandates**. Surface early companies with founders and
provenance you can re-run; match them to what the firm actually invests in;
brief with receipts. Tier-1 CA / US / UK is the **coverage wedge** for the
next stretch of sourcing work — a sequencing choice, **not** the brand
tagline and **not** a claim of full coverage. Emerging-school discovery is how
coverage catches the next Waterloo before GPs keyword it.

Agents (scouts, coverage jobs, research write-back) are **infrastructure**
for that loop. Meridian is not selling an agent chat or “AI agent platform.”

---

## The Actual Strategic Bet

Meridian's wedge is not "AI writes better memos" (Reframe 1, commodity).
It is not even "AI knows your fund's thesis" alone (Reframe 2, valuable, but
still built on data anyone else could also access).

The bet is a **provenance-first, mandate-native graph** of early companies —
starting where founders are born (schools, incubators, community programs) —
that competitors who only index post-announcement, API-visible companies
structurally cannot see early enough. Access and continuous coverage of those
fragmented sources compound into a data layer; the product is how firms
consume it against their mandate.

Everything since — multi-firm profiles, Deal Flow, school registry / scout,
coverage crons, brief→graph write-back, trust ranking, proof packets — is
instrumentation for that bet, not scope creep away from a simpler product.

---

## What shipped / decided (as of 2026-07-24)

These are product and ops facts landing/video agents should treat as current.
Do **not** inflate them into full-coverage or agent-platform claims.

### School → mandate loop

- Tier-1 school registry, scout, emerging-school proposals, `/schools` UI,
  coverage jobs, brief→graph write-back, job log (mentor-demo infra P0–P3).
- Continuous school-coverage scrapes (Vercel Hobby once-daily crons + GitHub
  Actions for denser cadence where Hobby limits apply).
- Bulk-corpus path treats below-target fill as progressive success (stops
  noisy false-alarm “failures” when the corpus is still growing).
- School-scout false-match hardening (e.g. Cal≠Calgary, Cambridge UK≠ON).

### Trust ranking

- Dated incubator / cohort provenance ranks **above** unverified AI
  `university_scout` on Flow. Prefer receipts over model guesses.

### Meridian Staging

- Canonical demo host: **https://meridian-stg.vercel.app**
  (aliases may also point at the same deploy; prefer `meridian-stg` in scripts
  and mentor copy).
- Staging identity: **Sign in → claim firm** (fund / family office / angel /
  company). Unclaimed demo seeds cleared; workspace routes require a claimed
  firm. **No Panache (or any real fund) as default.**

### UI direction

- App UI: readable contrast, sans-first workspace typography, pine/ink system
  without purple clash. Polish favors clarity over “agent terminal” theatrics.

### Mentor-demo honesty

- Pitch: school ecosystems → fund mandates; deal velocity with receipts.
- Hard don’ts: full CA/US/UK coverage claims; “AI agent platform”; PitchBook /
  Harmonic replacement; inventing numbers not shown on `/pilot` or live UI.
- Good enough for feedback — not claiming genius or completeness.

### Demo identity

- Preferred fictional firm for demos going forward: **Meridian Ventures**
  (or similar fictional FO).
- Optional real-fund seed kits may remain for operators who explicitly activate
  them; they are not the vision hero and must not auto-claim on staging.

---

## The Two-Sided Value Loop

The product is not just "find companies, write memos about them." It is a
loop with two distinct beneficiaries, which is why sourcing and briefing
cannot be separated into two products:

```
Campus + community access (schools, incubators, grants, events)
        ↓
Structured, resolved entities (person + company, linked, with provenance)
        ↓
Two outputs from the same underlying data:
        ↓                                    ↓
  Sourcing for firms                   Talent / company discovery
  (funds, FOs, angels)                 for anyone else who needs it
  "find deals before they're           (recruiters, other founders,
   publicly findable"                   accelerators themselves)
        ↓                                    ↓
  Pursue/Pass signals                  Usage validates data quality
  refine the mandate model             without needing VC adoption
  over time                            to prove the data is real
```

This is the getfundingfromvc.com insight, generalized correctly: the value
of structured access to a fragmented community doesn't only serve VCs. If
the same underlying entity-resolution data can also answer "who are the
best pre-seed founders in this campus ecosystem right now" for a completely
different audience, then the data's accuracy gets validated by real usage
from people who have nothing to do with venture capital.

---

## Long-run vision — Failed founders → VC talent programs

> **Status: long-run hypothesis only. Not current product. Do not implement,
> demo, or market as shipped.**

**Reusable thesis (landing / video agents — copy as-is or lightly adapt):**

VCs already hire from portfolio companies and hunt talent constantly; the best
operators and program candidates are often founders — including failed and
former founders. Meridian’s long-run bet is to become the mandate-native,
provenance-first graph that turns that founder recirculation into feeders for
VC talent programs: portfolio hiring, fellowships, scout and operator tracks,
and other pipelines — campus ecosystems remain the *birthing* layer;
founder/talent recirculation is the *compounding* layer.

### Why this follows from the near-term wedge

| Layer | Role |
|-------|------|
| **Birthing (near-term)** | School ecosystems → companies matched to mandates |
| **Compounding (long-run)** | Failed / former founders re-enter as talent, scouts, operators, and portfolio hires |

The graph that already ties people ↔ companies ↔ schools ↔ provenance is the
same substrate. Near-term Meridian answers “which campus companies fit this
mandate?” Long-run Meridian answers “which people from this graph should this
firm’s programs and portfolio hire or enroll?” — still firm-agnostic,
still dated and sourced, still not an agent chat.

### Explicit non-claims

- Not a jobs board today.
- Not a claim that Meridian places talent today.
- Not a reason to deprioritize school→mandate coverage work.
- Mentors and films should not lead with this thesis until product exists.

---

## UI and brand posture (product surface, not Remotion)

Direction for the app (as decided alongside staging polish):

- Readable contrast; sans-first app UI.
- Firm-agnostic surfaces — brand Meridian, not a customer fund.
- Landing and film copy are owned separately; this doc constrains **what is
  true to claim**, not headline wording.

---

## What This Means for Prioritization Going Forward

Any new feature request should be checked against:

1. **Does it strengthen mandate-native, provenance-first coverage** (schools,
   incubators, grants, entity resolution, trust ranking)?
2. **Does it improve honest consumption** (Flow, Brief, proof, firm claim)
   without overclaiming coverage?
3. **Is it agent infrastructure in service of (1)–(2), or are we pitching
   agents as the product?** Prefer the former.

Output-layer features (outreach, templates, digests) stay valuable only when
the input layer is dense and ranked by trust. Invented stats and US-biased
noise are symptoms of thin, low-trust sources — not reasons to abandon the
wedge.

---

## What "Done" Looks Like for This Phase

Not a longer feature list. A specific, falsifiable outcome:

1. On Meridian Staging, a claimed firm (e.g. Meridian Ventures) watches a
   mandate and sees school- and incubator-sourced rows with provenance —
   dated incubators preferred over unverified scout guesses.
2. Brief produces a forwardable one-pager against **that** mandate, with
   receipts the team can defend.
3. Continuous coverage jobs keep the school layer growing without false-alarm
   corpus failures drowning the signal.
4. Mentors hear school→mandate + deal velocity with receipts — **not** full
   Tier-1 coverage, **not** agent platform, **not** talent-program placement.

Long-run talent recirculation is out of scope for “done” in this phase.
