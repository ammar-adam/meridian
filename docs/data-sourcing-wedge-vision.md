# Meridian — The Data Sourcing Layer as Market Wedge

## Purpose

This document is specifically about why the multi-source data layer (schools,
incubator cohorts, grants, event hosts, domain/registry signals, entity
resolution) is not just a feature of Meridian — it is the actual go-to-market
strategy. Read this before data-sources work so build decisions serve the
market-entry logic, not just the technical spec.

**Parent strategy:** [meridian-vision.md](./meridian-vision.md) (Reframe 5:
school ecosystems → fund mandates; long-run talent recirculation).

---

## The Core Strategic Insight

Every AI memo/screening tool, including Meridian's own earlier reframes,
competes on the same layer: taking data that already exists somewhere
public (Perplexity search results, Crunchbase, PitchBook, StartupHub) and
synthesizing it better. That is a synthesis wedge. It is real, but it is
shallow, because the underlying data is available to every competitor
equally. Better prompting and better templates are not a moat, because
anyone can copy a prompt.

The data sourcing layer is a different kind of wedge entirely: a
**distribution wedge on top of a data-ownership wedge.** Instead of competing
on who synthesizes existing public data better, Meridian competes on having
structured, provenance-bearing coverage of companies that originate in
**school ecosystems and community programs** — Velocity-class incubators,
campus venture networks, grant lists, emerging schools — matched to firm
mandates. Much of that signal is not available as a clean API; continuous
coverage jobs and trusted cohort structure matter more than another chat UI.

**The wedge is not "we have an AI tool." The wedge is "we have data nobody
else has structured this way, and the product is how firms consume it
against their mandate."**

Agents (scouts, coverage crons, research write-back) are **how the layer
compounds**. They are not the pitch. Meridian is not an “AI agent platform.”

---

## Coverage wedge vs brand tagline

| Phrase | Role |
|--------|------|
| **School ecosystems → fund mandates** | Near-term product thesis (safe to lead with) |
| **Tier-1 · CA / US / UK** | **Coverage sequencing** — where we densify first; **not** the brand tagline; **not** a full-coverage claim |
| **Dated. Sourced. Brief-ready.** | Honesty constraint on every row and memo |

Mentor and film hard don’ts: do not claim complete Tier-1 coverage; do not
claim Harmonic/PitchBook replacement; do not invent `/pilot` numbers.

---

## Trust ranking (shipped preference)

When ranking and presenting Flow rows:

1. **Dated incubator / cohort provenance** (structured founders + source) wins.
2. Unverified AI **`university_scout`** is demoted until grounded.
3. Weak registry / domain signals stay amber — human skim, not hero claims.

This is the operational expression of “receipts over model guesses.” Bulk
corpus growth is progressive; below-target fills are not treated as hard
failures that drown the signal (false-alarm fix, Jul 2026).

---

## Why This Beats Synthesis-Only Competitors

Harmonic, Spectre, PitchBook, Gravity, Meridia, VCBrain — and similar tools —
optimize for a US-centric, API-indexed view of the startup world. They are
good at finding companies that already have a funding announcement, a press
mention, a Crunchbase profile — i.e., companies that are already findable
by definition. None of them reliably see a company two people are quietly
building inside a campus incubator cohort three weeks before it has a website
worth indexing. That is not a data quality gap they can close by scraping
harder alone. It is a structural blind spot until the company chooses to
become public — and by then the early advantage is gone.

Being early is the entire value proposition in early-stage investing. A
tool that only surfaces companies once they're publicly indexable is, by
definition, only useful for finding companies everyone else can already
find. Meridian inverts this: school + community structure with provenance,
continuously covered, matched to mandates.

---

## Why This Is a Genuine Go-to-Market Strategy, Not Just a Feature

A go-to-market strategy answers: why would a customer choose this over
every alternative, and why can't the alternative just copy it next quarter.

**The "why choose this" answer:** Early-stage funds and family offices have
already described the same gap in their own words — finding founders before
they announce, outside US-centric indexed tools. The product answer is
mandate-ranked campus/community deal flow with receipts, not another memo
generator.

**The "why can't they copy it" answer:** A well-funded competitor can copy
a UI, a memo template, a prompt, even a pipeline architecture, in weeks.
They cannot instantly copy densifying coverage of specific school ecosystems,
trusted cohort structure, entity resolution with provenance, and continuous
jobs that keep that graph fresh. Embedded ecosystem access accelerates
Phase 1 verification; the durable asset is the compounding graph, not a
single customer logo.

Firm-agnostic rule: do **not** make any real fund the hero of this wedge.
Preferred fictional demo identity: **Meridian Ventures** (or similar FO).
Optional seed kits for named funds are operator conveniences only.

---

## The Market Entry Sequence

This is not "build a global university database overnight." It is densify
where verification and trust are highest, then expand.

```
Phase 1 — Prove density in reachable campus / incubator ecosystems
  Sources: Tier-1 CA seeds + Velocity-class cohorts, school scout with
           false-match guards, grants / registry as weak supporting signals
  Goal: falsifiable rows with founders + provenance that beat generic
        StartupHub / Perplexity for the same early thesis
  Staging: meridian-stg.vercel.app — claim firm, watch mandate, Flow + Brief

Phase 2 — Tier-1 coverage wedge (CA / US / UK) + emerging schools
  Sources: expand school registry, continuous coverage crons, emerging-school
           proposals (catch the next Waterloo before keyword search)
  Goal: useful mandate-matched feeds across the Tier-1 set we can defend;
        never claim “full coverage” until measured on /pilot and live corpus

Phase 3 — Broader community + national / regional depth
  Sources: additional incubators, grant programs, registries as they become
           structured and dated
  Goal: the sourcing layer early-stage allocators cannot get elsewhere —
        still provenance-first, still mandate-native

Phase 4 — Beyond deal sourcing (same graph, different question)
  Non-VC usage (recruiters, cofounder search, accelerators) validates data
  quality faster than slow fund sales cycles alone.

Phase 5 — Long-run: founder / talent recirculation (NOT current product)
  See meridian-vision.md — Failed founders → VC talent programs.
  Campus ecosystems = birthing layer; failed/former founders feeding
  portfolio hiring, fellowships, scout/operator programs = compounding layer.
  Explicitly out of scope for current demos and claims.
```

**Do not skip to Phase 3–5 before Phase 1–2 density is honest.** Expanding a
weak, unverified scout layer nationally only produces noise at greater scale.

---

## Why This Also Fixes Reliability Problems

Invented stats and thin, US-biased Discover/Flow results trace back to the
same root cause: generic, low-trust sources answering questions that
community-specific, high-trust sources answer better. A dated incubator
cohort listing does not require a model to invent whether a company existed
in a program. An unverified university scout guess does. Trust ranking and
continuous school coverage are the fix for why synthesis-on-thin-data kept
failing — not an extra feature stacked on an unreliable core.

---

## Ops facts that support the wedge (Jul 2026)

- **Meridian Staging:** https://meridian-stg.vercel.app
- Continuous school-coverage scrapes (Hobby cron limits → once-daily on
  Vercel; denser cadence via GitHub Actions where needed).
- Bulk-corpus progressive success (no false-alarm failure spam at below-target).
- Staging identity: Sign in → claim firm; no default real-fund hero.

---

## The Test for Whether This Wedge Is Real

Not "does the code run." The actual test:

1. Pick companies currently inside a campus / incubator ecosystem that are
   weak or invisible in generic index tools.
2. Confirm Meridian surfaces them with founders and provenance under a real
   claimed mandate (prefer Meridian Ventures fiction for demos).
3. Confirm dated incubator rows outrank unverified scout guesses.
4. Confirm Brief ships a defendable thesis band against that mandate.

If that works for a small, honest set, the wedge is proven in principle and
the rest is densification. If it only works by inventing coverage, revisit
the strategy rather than scaling the lie.
