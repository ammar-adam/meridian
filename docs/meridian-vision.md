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

---

## The Origin, Restated Plainly

A manually written investment memo on NationGraph, built using Claude with
no automation, got sourcing credit from the GP of Sagard's AI Fund. He didn't
just like the output. He asked, unprompted, how it was generated and whether
it could be automated. That single reaction is the entire reason this
product exists. Everything since has been trying to figure out what the
real, defensible version of "automate that" actually looks like.

---

## The Four Reframes, and Why Each One Was Correct

The product's framing has shifted four times over the course of building it.
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
fund should care* is not. The thesis band, the fund-specific reasoning at
the bottom of the memo, is what actually made the original NationGraph memo
land with Evan. Generic research any tool can produce; fund-specific
judgment requires knowing the fund. This reframe correctly identified WHERE
the value lives in the output, but not yet where the value lives in the
process of getting there.

**Reframe 3 — Sourcing as the wedge, not just briefing.**
Two independent conversations, one with Inshaal at Panache, one with a bank
investment head, converged on the same point: the hard problem in early-stage
investing isn't writing up a company once you've found it, it's finding the
company in the first place. Existing tools (Harmonic, Spectre, Pitchbook)
solve this for the US market and treat Canada, and small/early-stage deal
flow generally, as an afterthought. This reframe correctly identified that
Meridian was solving the easier half of the problem and ignoring the harder,
more defensible half.

**Reframe 4 — Geographic and community fragmentation as the actual data
problem.**
The sharpest reframe yet, and the one this document exists to formalize.
The bank investment head's framing was: early-stage deal flow isn't
centrally indexed anywhere, it's fragmented across university venture clubs,
incubator cohorts, grant recipient lists, and small community events, none
of which publish an API, all of which require someone with actual access
and trust inside that community to surface. Inshaal independently confirmed
the same structural gap from the fund side: every tool she's evaluated
optimizes for a US-centric, API-indexed view of the startup world, which
misses exactly the kind of company Panache is trying to find first.

This is not a bigger, vaguer vision than the previous three reframes. It is
the answer to why the previous reframes kept running into thin data: Reframe
2's thesis band was only as good as the research feeding it, and Reframe 3's
sourcing layer kept returning generic, US-biased, low-density results,
because both were built on top of data sources (StartupHub, generic
Perplexity, evaluated-but-thin Pitchbook access) that structurally cannot
see the fragmented, community-level layer where early-stage Canadian
companies actually live before they're findable any other way.

---

## The Actual Strategic Bet

Meridian's wedge is not "AI writes better memos" (Reframe 1, commodity,
replicable in a weekend, already crowded — Meridia, VCBrain, Harmonic Scout
all do some version of this). It is not even "AI knows your fund's thesis"
alone (Reframe 2, valuable, but still built on data anyone else could also
access).

The actual bet is: **the founder has real, existing, non-fungible access to
the exact fragmented communities where this problem is worst** — Waterloo
Venture Group, Techyon, Hack the North, Velocity, the broader Waterloo
startup ecosystem — **and can build a sourcing data layer from those
communities that no US-focused, API-dependent competitor can replicate,
because it isn't a data engineering problem, it's a trust and access
problem.** Harmonic can hire an engineer to build a scraper. Harmonic
cannot hire someone with three years of embedded relationships inside
Waterloo's venture ecosystem. That access is the actual moat, and it long
predates Meridian as a product.

Everything since — the outreach feature, multi-fund profiles, stage-aware
memos, the domain registry adapter, the incubator cohort adapter, the entity
resolution layer — is instrumentation for capturing and structuring that
access advantage, not scope creep away from a simpler product.

---

## The Two-Sided Value Loop

The product is not just "find companies, write memos about them." It is a
loop with two distinct beneficiaries, which is why sourcing and briefing
cannot be separated into two products:

```
Community access (Waterloo, Velocity, WVG, Techyon, incubators, grants)
        ↓
Structured, resolved entities (person + company, linked, with provenance)
        ↓
Two outputs from the same underlying data:
        ↓                                    ↓
  Sourcing for funds                   Talent/company discovery
  (Panache, Sagard, Diagram)           for anyone else who needs it
  "find deals before they're           (recruiters, other founders,
   publicly findable"                   accelerators themselves)
        ↓                                    ↓
  Pursue/Pass signals                  Usage validates data quality
  refine the fund's thesis             without needing VC adoption
  model over time                      to prove the data is real
```

This is the getfundingfromvc.com insight, generalized correctly: the value
of structured access to a fragmented community doesn't only serve VCs. If
the same underlying entity-resolution data can also answer "who are the
best pre-seed founders in Waterloo right now" for a completely different
audience — a recruiter, another founder looking for a cofounder, an
accelerator doing its own sourcing — then the data's accuracy gets validated
by real usage from people who have nothing to do with venture capital,
which is a faster and cheaper way to prove data quality than waiting for a
GP to tell you the thesis band was good.

---

## What This Means for Prioritization Going Forward

Any new feature request should be checked against this question: **does it
strengthen the community-access data layer, or does it add surface area on
top of a data layer that's still thin?**

The recent validation pass found real memo pipeline bugs (invented stat
numbers, a broken UI) sitting underneath several sprints of new feature
work (outreach, multi-fund, templates, Canadian registry). Those bugs are
not a distraction from the vision above — they are the direct, predictable
consequence of building output-layer features faster than the input-layer
data problem was actually solved. A thesis band or memo can only be as
honest and specific as the data feeding it. Reframe 4 is the correct
diagnosis of why quality kept lagging: the data layer was never actually
the sourced, high-trust, community-specific layer described above. It was
StartupHub and generic web search wearing a thesis-aware wrapper.

**The implication is sequencing, not abandonment.** The UI blocker and the
invented-stats bug still need to be fixed — a broken product cannot
demonstrate a good data layer even once one exists. But once those are
fixed, the highest-leverage work is not more memo features. It is building
out the actual community-sourced entity layer (domain registry, incubator
cohorts, grants, event hosts, entity resolution) described in the adjacent
sprint prompt, because that is the layer every other feature in the product
depends on for its quality.

---

## What "Done" Looks Like for This Phase

Not a longer feature list. A specific, falsifiable outcome: run Discover
under a Canadian pre-seed thesis and get back results that are visibly,
provably better — more specific, more Canada-relevant, more pre-announcement
— than what Harmonic, Spectre, or a generic Perplexity search would return
for the same query, because they are sourced from communities those tools
structurally cannot see. That is the test. Everything else is in service of
passing it.
