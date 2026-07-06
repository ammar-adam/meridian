# Meridian — The Data Sourcing Layer as Market Wedge

## Purpose

This document is specifically about why the multi-source data layer (domain
registry, incubator cohorts, grants, event hosts, entity resolution) is not
just a feature of Meridian, it is the actual go-to-market strategy. Read this
before the data-sources sprint prompt so the build decisions serve the
market-entry logic, not just the technical spec.

---

## The Core Strategic Insight

Every AI memo/screening tool, including Meridian's own earlier reframes,
competes on the same layer: taking data that already exists somewhere
public (Perplexity search results, Crunchbase, Pitchbook, StartupHub) and
synthesizing it better. That is a synthesis wedge. It is real, but it is
shallow, because the underlying data is available to every competitor
equally. Better prompting and better templates are not a moat, because
anyone can copy a prompt.

The data sourcing layer is a different kind of wedge entirely: a
**distribution wedge on top of a data-ownership wedge.** Instead of competing
on who synthesizes existing public data better, Meridian competes on having
access to data that does not exist anywhere else in structured form,
because it lives inside communities (Waterloo Venture Group, Techyon,
Velocity, Hack the North, grant programs) that only someone embedded in
them can actually surface. This is not a feature a competitor can replicate
by hiring a better engineer. It requires years of trust and relationships
inside a specific ecosystem, which is exactly what already exists here,
independent of Meridian as a product.

**The wedge is not "we have an AI tool." The wedge is "we have data nobody
else has, and the tool is how we deliver it."**

---

## Why This Beats Every Competitor Named So Far

Harmonic, Spectre, Pitchbook, Gravity.com, Meridia, VCBrain — every one of
these competitors, confirmed directly by Inshaal's own evaluation of them,
optimizes for a US-centric, API-indexed view of the startup world. They are
good at finding companies that already have a funding announcement, a press
mention, a Crunchbase profile — i.e., companies that are already findable
by definition. None of them can see a company two people are quietly
building inside a Velocity cohort three weeks before it has a website worth
indexing. That is not a data quality gap they can close by scraping harder.
It is a structural blind spot, because the data does not exist publicly
until the company chooses to make it exist publicly, and by then five other
funds have already seen it too.

Being early is the entire value proposition in early-stage investing. A
tool that only surfaces companies once they're publicly indexable is, by
definition, only useful for finding companies everyone else can already
find. The data sourcing layer inverts this: it surfaces companies before
they are publicly indexable, using access to the specific, small,
relationship-gated communities where those companies actually originate.

---

## Why This Is a Genuine Go-to-Market Strategy, Not Just a Feature

A go-to-market strategy answers: why would a customer choose this over
every alternative, and why can't the alternative just copy it next quarter.

**The "why choose this" answer:** Panache, Sagard, and similar early-stage
funds have already told you, independently and unprompted, that their
biggest unsolved sourcing problem is exactly this — finding founders before
they announce, finding them outside the US-centric tools every platform
already sells them. You are not guessing at a market need. Two separate,
real potential customers described the same gap in their own words before
you built anything to address it.

**The "why can't they copy it" answer:** A well-funded competitor can copy
a UI, a memo template, a prompt, even a data pipeline architecture, in
weeks. They cannot copy three years of embedded relationships inside
Waterloo's venture ecosystem, a personal role organizing Hack the North and
Waterloo Tech Week, direct access to Velocity's cohort information, and a
firsthand understanding of which Waterloo-adjacent people are quietly
building things worth watching. That access predates Meridian and cannot
be acquired by hiring an engineer or buying an API key. This is the actual
defensible layer, in a way that no prompt, template, or feature ever was.

---

## The Market Entry Sequence

This is not "build a national Canadian sourcing database." It is a
deliberately narrow, geography-first entry, mirroring how the jobsindubai.com
example actually worked: prove density and accuracy in one small, real
community first, where you already have unfair access, before expanding.

```
Phase 1 — Waterloo ecosystem (where access already exists)
  Sources: Velocity cohorts, WVG-adjacent founders, Techyon/Hack the North
           network, domain registrations filtered to Waterloo-adjacent names
  Goal: prove the entity resolution and data quality works at all, in the
        one place where ground-truth verification is easiest (you can
        personally confirm whether a sourced company/founder pairing is
        actually accurate, because you likely know some of them directly)

Phase 2 — Ontario-wide (Panache's stated highest-volume region)
  Sources: expand incubator coverage beyond Velocity (DMZ, Creative
           Destruction Lab, other Ontario accelerators), Ontario Business
           Registry cross-referenced with domain registrations
  Goal: become genuinely useful to Panache specifically, since Ontario is
        50%+ of their deal flow and the region where the data layer from
        Phase 1 generalizes most naturally

Phase 3 — National Canadian coverage
  Sources: federal registry data at full scale, grant recipient data
           nationally, additional incubators (Quebec, BC, Alberta ecosystems)
  Goal: become the sourcing layer for the 20-30 fund total addressable
        market Inshaal herself identified, which was previously assessed
        as "too small for a standalone Canadian product" — but that
        assessment was about building a generic Canadian Harmonic clone,
        not about owning a genuinely differentiated, community-sourced
        data layer that those 20-30 funds cannot get anywhere else

Phase 4 — Beyond VC, the getfundingfromvc.com insight
  Once the entity-resolution data layer is accurate at meaningful scale,
  it has value independent of venture capital: recruiters looking for
  early technical talent, other founders looking for cofounders,
  accelerators doing their own sourcing, corporate innovation teams
  scouting acquisition targets. This is not scope creep — it is the same
  underlying data answering a different question, and usage from these
  non-VC audiences validates data quality and accuracy faster and cheaper
  than waiting for slow-moving fund sales cycles to confirm it.
```

**Do not skip to Phase 3 or 4 before Phase 1 is proven.** The entire
strategic logic depends on Phase 1 actually working, on you being able to
personally verify that the entity resolution layer produces real, accurate,
non-fabricated results in the one community where you can check the ground
truth yourself. If domain registration cross-referencing and Velocity
cohort data don't produce genuinely useful, verifiably accurate results in
Waterloo specifically, expanding the same weak approach nationally just
produces the same StartupHub-quality noise at greater scale.

---

## Why This Also Fixes the Product's Current Reliability Problems

The validation pass found invented stat numbers and thin, US-biased Discover
results. Both problems trace back to the same root cause: the pipeline was
relying on generic, low-trust sources (a single Perplexity pass, StartupHub)
to answer questions that community-specific, high-trust sources answer far
better. A Velocity cohort listing does not require Claude to guess whether
a company's funding is real, because the cohort itself is a form of
verification. An incorporation-plus-live-domain signal for a Waterloo-adjacent
company is a fact, not an inference. The data sourcing wedge is not an
additional feature stacked on top of an unreliable core, it is the fix for
why the core was unreliable in the first place.

---

## The Test for Whether This Wedge Is Real

Not "does the code run." The actual test: pick a company currently inside
the Waterloo ecosystem that is not yet publicly findable through a normal
web search or Crunchbase listing — something genuinely pre-announcement,
which you likely already know about personally through WVG, Techyon, or
Velocity — and confirm the data sourcing layer surfaces it before it would
otherwise be findable through Harmonic, Spectre, or a generic Perplexity
search. If it can do that once, for one real company, the wedge is proven
in principle and the rest is expansion. If it cannot, no amount of
additional source adapters fixes the underlying gap, and the strategy needs
to be revisited honestly rather than built around further.
