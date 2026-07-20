# Mentor demo script — data wedge

**Runtime:** ~3–4 minutes  
**Audience:** industry mentors  
**Claim:** Meridian finds early Canadian companies (founders + domains) from fragmented community sources before they’re indexable in Harmonic/PitchBook-style tools — then briefs them against a fund thesis.

Live app: https://meridian-eight-sandy.vercel.app

---

## Before you hit record

1. Open Discover. Select **Panache** (or any Canada-leaning fund) in the fund switcher.
2. Click **Mentor demo thesis** → **Run search**. Wait for results (can take 1–2 min first time).
3. Confirm top rows show **Incubator** badges with **Founders:** lines and Velocity/DMZ/CDL provenance.
4. Optional: open Library and confirm wedge fallbacks exist, or in console after visiting any workspace page you can call nothing — fallbacks live in `lib/demo-memo.js` (`openWedgeDemoMemo`).
5. Do **not** demo EverTrace, share links, or “we beat PitchBook coverage.”

**Exact thesis text (if button missing on old deploy):**

> Canadian pre-seed and seed startups from Waterloo and Toronto accelerators (Velocity, DMZ, CDL) — AI, fintech, healthtech, and deep tech

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

### 3. Fake-portfolio foil — getfundingfromavc analytics (~30s)

**What this is:** Not a Meridian feature. Screen-share **getfundingfromavc.com analytics** (or your saved recording of it) showing a fabricated portfolio company like “GiveFund” on a fund site — the accuracy failure mode of scrapers that trust fund marketing pages.

**Spoken line:**

> A lot of VC tools scrape fund websites and treat the portfolio list as ground truth. Analytics on getfundingfromavc show how easy it is to invent or mirror a fake portfolio name. Meridian’s wedge is the opposite: we start from cohort and registry structure with provenance — Velocity, DMZ, CDL — not inventing companies off a marketing page.

**Then cut back to Meridian Discover** and point at a real Incubator row with founders + domain.

> If getfundingfromavc.com is down mid-record, skip this beat or use a pre-saved screenshot. Do not claim Meridian hosts that analytics product.

---

### 4. Domain signal — honest (~30s)

**Click:** any amber **Registry · low** row (if present).

> Recent Canadian incorporation plus a live domain. Weak signal — human skim required. We are not claiming WHOIS rush clustering or EverTrace. Amber means “interesting, verify.”

If no registry row appears, skip this beat — do not invent it.

### 5. Brief close (~45s)

**Click:** Brief on SCADABLE or Eventist → wait for memo → thesis band.

> Same company, now a forwardable one-pager against the fund mandate. Discover finds; Brief ships.

**If live Brief flakes:** on Discover click **Fallback brief** (SCADABLE static memo), or Brief `https://scadable.com` / `https://eventist.ca` live.

---

## GiveFund / getfundingfromavc beat

**Clarified:** “Fake GiveFund” = the fabricated portfolio-company failure mode shown in **getfundingfromavc.com analytics** (scrapers trusting fund-site portfolio lists), not a Meridian entity.

**Recording note (2026-07-20):** `getfundingfromavc.com` did not resolve (NXDOMAIN) from the build machine. Bring a **working URL or a saved screenshot/clip** of the analytics “GiveFund” example before you hit record. If neither exists, skip beat 3.

---

## What not to say

- “We have national Corporations Canada coverage”
- “EverTrace is live”
- “Domain rush with registration dates”
- “We replace PitchBook / Harmonic”
- Invented revenue or headcount on thin companies — if a stat looks soft, say “verify” and move on

---

## Dry-run checklist

- [ ] Mentor demo thesis returns incubator rows in the first screen
- [ ] At least one row shows Founders + domain + cohort provenance
- [ ] getfundingfromavc analytics clip/screenshot ready (or beat 3 skipped)
- [ ] Registry rows (if any) are amber and dated — no foundations/charities
- [ ] One Brief completes or wedge fallback memo opens cleanly
- [ ] No console errors on Discover → Memo path
