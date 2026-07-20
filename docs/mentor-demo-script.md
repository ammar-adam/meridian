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
2. Open Discover. Select **Panache** in the fund switcher.
3. Click **Mentor demo thesis** → **Run search**. Wait for results (can take 1–2 min first time). Pre-run once so the second open is cached.
4. Confirm top rows show **Incubator** badges with **Founders:** lines and Velocity/DMZ/CDL provenance. **No** violet EverTrace research banner when incubator rows dominate.
5. Open the foil tab: https://getfundingfromavc.vercel.app — GiveFund row must show **fabricated · no entity**.
6. Do **not** demo EverTrace, share links, Team, or “we beat PitchBook coverage.”

**Exact thesis text (if button missing — hard refresh / wait for deploy):**

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

**If live Brief flakes:** Discover → **Fallback brief** (SCADABLE — IoT / cloud one-liner, Ali Rahbar). Or Brief `https://scadable.com` / `https://eventist.ca` live.

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

- [ ] Mentor demo thesis returns incubator rows in the first screen
- [ ] At least one row shows Founders + domain + cohort provenance
- [ ] Foil URL loads; GiveFund = fabricated
- [ ] No Clerk development badge visible (or recording localhost)
- [ ] No EverTrace docs path banner on a strong incubator result set
- [ ] Registry rows (if any) are amber and dated — no foundations/charities
- [ ] One Brief completes or Fallback brief opens with IoT/cloud SCADABLE copy
- [ ] No console errors on Discover → Memo path
