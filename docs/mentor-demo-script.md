# Mentor demo script — data wedge

**Runtime:** ~3–4 minutes  
**Audience:** industry mentors  
**Claim:** Meridian finds early Canadian companies (founders + domains) from fragmented community sources before they’re indexable in Harmonic/PitchBook-style tools — then briefs them against a fund thesis.

| Surface | URL |
|---------|-----|
| Meridian | https://meridian-eight-sandy.vercel.app |
| Foil (GiveFund analytics) | https://getfundingfromavc.vercel.app |

---

## Before you hit record

1. Prefer **localhost** (`npm run dev`) if Clerk still reports `clerkMode: development` on prod — CSS hides the badge after latest deploy, but localhost is safer. Or set Vercel `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` to **pk_live_ / sk_live_**.
2. Open Discover. Select **Panache** in the fund switcher (first-visit seed defaults to Panache).
3. Paste the thesis below → **Run search**. Wait for results (can take 1–2 min first time). Pre-run once so the second open is cached.
4. Confirm top rows show **Incubator** badges with **Founders:** lines and Velocity/DMZ/CDL provenance. **No** violet EverTrace research banner when incubator rows dominate.
5. Open the foil tab: https://getfundingfromavc.vercel.app — GiveFund row must show **fabricated · no entity**.
6. Do **not** demo EverTrace, share links, Team, or “we beat PitchBook coverage.”

**Exact thesis text:**

> Canadian pre-seed and seed startups from Waterloo and Toronto accelerators (Velocity, DMZ, CDL) — AI, fintech, healthtech, and deep tech

**Only click these golden rows:** SCADABLE, Eventist, Photon-IV, Simantic.

---

## Spoken beats

### 1. Fragmented sources → one list (~45s)

> Early Canadian deal flow doesn’t live in one database. It lives on Velocity pages, DMZ cohorts, CDL streams, grant disclosures, and recent incorporations — fragmented across campuses and cities.
>
> Meridian’s Discover unifies those community sources into one thesis-ranked list. Watch the provenance badges: incubator vs grant vs registry.

**Click:** scroll the table; point at Velocity + DMZ/CDL rows.

### 2. Accuracy foil (~45s)

**Click:** SCADABLE, Eventist, Photon-IV, or Simantic (Founders + domain rows).

> StartupHub still returns zero name matches on these Velocity companies. Meridian already has founders and domains from cohort structure — no research round-trip.
>
> That’s the wedge: not a prettier memo — structured community data competitors don’t ship.

### 3. Fake-portfolio foil — getfundingfromavc (~30s)

**Cut to:** https://getfundingfromavc.vercel.app

> A lot of VC tools scrape fund websites and treat the portfolio list as ground truth. Here’s GiveFund — it shows up on a fund page scrape, and verification says fabricated. No real entity.
>
> Meridian’s wedge is the opposite: cohort and registry structure with provenance — not inventing companies off a marketing page.

**Cut back to Meridian Discover** → golden Incubator row.

### 4. Domain signal — honest (~30s)

**Click:** any amber **Registry · low** row (if present).

> Recent Canadian incorporation plus a live domain. Weak signal — human skim required. We are not claiming WHOIS rush clustering or EverTrace. Amber means “interesting, verify.”

If no registry row appears, skip this beat — do not invent it.

### 5. Brief close (~45s)

**Click:** Brief on SCADABLE or Eventist → wait for memo → thesis band.

> Same company, now a forwardable one-pager against the fund mandate. Discover finds; Brief ships.

**If live Brief flakes:** Brief `https://scadable.com` / `https://eventist.ca` live. Do not use product fallback buttons — they were removed from Discover.

---

## GiveFund / getfundingfromavc

Foil site lives at **https://getfundingfromavc.vercel.app** (repo: `c:\Users\aaamm\getfundingfromavc`). Point `getfundingfromavc.com` DNS at that Vercel project when purchased.

---

## What not to say

- “We have national Corporations Canada coverage”
- “EverTrace is live”
- “Domain rush with registration dates”
- “We replace PitchBook / Harmonic”
- Invented revenue or headcount on thin companies — if a stat looks soft, say “verify” and move on
- “getfundingfromavc is a full product” — it is a demo foil page

---

## Dry-run checklist

Verified 2026-07-20 (~3:45pm ET) against prod:

- [x] Mentor demo thesis returns incubator rows in the first screen (12/12 incubator, CA 12)
- [x] Golden rows present with Founders + domain (SCADABLE #3, Photon-IV #6, Eventist #9, Simantic #7)
- [x] Foil URL loads; GiveFund = fabricated — https://getfundingfromavc.vercel.app
- [x] Clerk development badge not visible (CSS hide); `clerkMode` still `development` in `/api/health`
- [x] No EverTrace banner on this result set (`thinCanadian: false`)
- [x] Fallback brief opens SCADABLE with IoT/cloud copy (not supply-chain)
- [ ] Human: one spoken dry-run of [`docs/mentor-demo-script.md`](docs/mentor-demo-script.md) without apology pauses

**Recording tip:** Discover cold run ~3 min — pre-run once (or hit Refresh) so tape opens on cached results. StartupHub showed `off` in health sidebar during dry-run; incubators still filled the list.
