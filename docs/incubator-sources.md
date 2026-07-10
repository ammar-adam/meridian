# Incubator / accelerator sources

## Attempted (this + prior sprint)

| Program | Public roster? | Usable for Meridian? | Entries shipped | Notes |
|---------|----------------|----------------------|-----------------|-------|
| **Velocity (UWaterloo)** | Yes — cohort announcements + company directory | **Yes** | May 2026 + Feb 2026 + Pitch 2025 finalists | Primary high-trust source; founders/domains from `velocityincubator.com/company/{slug}` |
| **DMZ (TMU)** | Yes — cohort posts + startup directory | **Yes** | Fall 2025 + Spring 2026 | Domains from public sites; founders sparse (directory lists some CEOs) |
| **CDL-Toronto** | Partial — LinkedIn stream graduate posts | **Yes (partial)** | AI + Cancer + Neuro 2025/26 | Company + one-liner; founders rarely on posts |
| Communitech | Job board / membership network | **No** | 0 | Work In Tech is hiring-oriented, not early cohort roster |
| MaRS Discovery District | MaRS Connect gated; public “who we work with” is alumni/momentum | **No** | 0 | Not early-stage cohort data without gated access |

## Enrichment pass (2026-07-10)

Before → after (all incubator rows):

| Metric | Before | After |
|--------|--------|-------|
| Total entities | 49 | **66** (Velocity 26 + DMZ 18 + CDL 22) |
| With founders | ~13 | **25** (Velocity-heavy) |
| With domain | ~3 | **25** |
| Fully enriched (founders + domain) | 1 | **18** |

### Velocity company pages checked

- Pattern: `https://www.velocityincubator.com/company/{slug}`
- Helper: `scripts/enrich-velocity-pages.mjs` (prints suggestions; production data edited manually)
- Domains filled from “Visit company” when not LinkedIn: e.g. worthington.ai, scadable.com, justmeds.ca, photon-iv.com, simantic.dev, getcanopywms.com, appfi.dev, colver.ca, jtcipher.com, tensor-one.com, eventist.ca, existentsorbents.com, newgenhealth.ca, patientcompanion.ca, swishsolar.com
- Founders filled for Feb/Pitch pages that listed them (Applied Intelligence, Appfi, Colver, JTCipher, TensorOne, One of One AI / `1-1`, NewGen Health, PatientCompanion, Swish Solar)
- **Still empty / no page:** Innowind (404), CELLECT (404), MapMate (404); Hope/Anthum/Flomaru/ItemIQ/02AI/Applied Intelligence have founders but no public non-LinkedIn domain on the page

### DMZ

- Directory: `dmz.torontomu.ca/startup-directory` — Access2Pay CEO Shrianand Misir; Aeovision Co-founder Ipek Isler
- Domains from public sites: access2pay.com, zeroma.com, kneadtech.com, trainingground.ai, julyhealth.com, reeku.co, loraverse.io (+ existing quotograph.io, aeovision.ai)
- **Gaps:** most Spring companies still lack founders; ClassClown, Manela, Arbling, Dawn Energy, Enabled Talent, Homekin, Tyce, MyKitchenOps, Smart Workforce ai still domain-null (no clear official site found without guessing)

### CDL

- AI 2025/26 (5), Cancer 2025/26 (10), Neuro 2025/26 (7) from CDL-Toronto LinkedIn graduate posts
- Founders not on those posts → left `[]`

## Velocity — announcement sources

- May 15, 2026: [Meet Velocity’s newest cohort](https://www.velocityincubator.com/news/meet-velocitys-newest-cohort)
- Feb 9, 2026: [Meet the Newest Companies Building at Velocity](https://www.velocityincubator.com/news/meet-the-newest-companies-building-at-velocity)
- Apr 2025: [Velocity Pitch Competition All Stars](https://www.velocityincubator.com/news/announcing-the-finalists-for-the-2025-velocity-pitch-competition-all-stars)

## DMZ — announcement sources

- Fall 2025 / Spring 2026 cohort posts on dmz.torontomu.ca
- Startup directory for occasional founder attribution

## Refresh plan (manual — not scraped)

1. **Quarterly:** Velocity + DMZ announcement posts → append cohort arrays.
2. Run `node scripts/enrich-velocity-pages.mjs` after new Velocity companies appear; copy founders/domains into the adapter only when the page lists them.
3. Prefer company pages for founder names; leave `founderNames: []` rather than inventing.
4. Add domain only when published (do not guess from name alone).
5. CDL: copy from public stream graduate posts when published.

## Why not scrape

Cohort announcements are infrequent. Manual transcription is sustainable and avoids ToS / block risk.
