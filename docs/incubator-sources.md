# Incubator / accelerator sources

## Attempted (this + prior sprint)

| Program | Public roster? | Usable for Meridian? | Entries shipped | Notes |
|---------|----------------|----------------------|-----------------|-------|
| **Velocity (UWaterloo)** | Yes — cohort announcements + company directory | **Yes** | May 2026 + Feb 2026 + Pitch 2025 finalists | Primary high-trust source; founders often on company pages |
| **DMZ (TMU)** | Yes — cohort announcement posts | **Yes** | Fall 2025 + Spring 2026 | Company + description public; founders usually **not** on announcement |
| **CDL-Toronto** | Partial — LinkedIn stream graduate posts | **Partial** | AI 2025/26 (5 cos) | Company names + one-liners; founders not on post |
| Communitech | Job board / membership network | **No** | 0 | Work In Tech is hiring-oriented, not early cohort roster |
| MaRS Discovery District | MaRS Connect gated; public “who we work with” is alumni/momentum | **No** | 0 | Not early-stage cohort data without gated access |
| NextAI / Distill | Press releases | Spotty | 0 | Defer |
| Techstars Toronto | Alumni lists | Partial | 0 | Defer |

## Velocity — what we used

- May 15, 2026: [Meet Velocity’s newest cohort](https://www.velocityincubator.com/news/meet-velocitys-newest-cohort) — 8 companies + founders from company pages
- Feb 9, 2026: [Meet the Newest Companies Building at Velocity](https://www.velocityincubator.com/news/meet-the-newest-companies-building-at-velocity) — 13 companies; founders filled where company pages published them
- Apr 2025: [Velocity Pitch Competition All Stars finalists](https://www.velocityincubator.com/news/announcing-the-finalists-for-the-2025-velocity-pitch-competition-all-stars) — company-level list (founders sparse on announcement)

## DMZ — what we used

- Fall 2025: [DMZ welcomes our Fall 2025 Cohorts](https://dmz.torontomu.ca/post/dmz-welcomes-our-fall-2025-cohorts)
- Spring 2026: [DMZ welcomes our Spring 2026 Cohorts](https://dmz.torontomu.ca/post/dmz-welcomes-our-spring-2026-cohorts)
- Directory exists at dmz.torontomu.ca/startup-directory but cohort posts are the cleanest structured public lists

## CDL — what we used

- CDL-Toronto AI 2025/26 graduate list from public LinkedIn announcement (Aixelo, FL01, MEISSNER, PreFab Photonics, RAKE ML)
- Other streams (Cancer, Neuro, etc.) exist on LinkedIn but were not fully transcribed this sprint — extend the same pattern later

## Communitech / MaRS — why empty

- **Communitech:** public surface is Work In Tech job board (1,400+ companies hiring), not a dated pre-seed cohort with founders. Membership-gated programs are not free public data.
- **MaRS:** MaRS Connect is the real directory and is gated for investors; public pages skew to later-stage Momentum alumni. Shipping those as “incubator cohort” would misrepresent stage and provenance.

## Refresh plan (manual — not scraped)

1. **Quarterly:** Velocity + DMZ announcement posts → append new cohort arrays in `lib/sourcing/incubator-adapter.js`.
2. Prefer company pages for founder names; leave `founderNames: []` rather than inventing.
3. Add domain only when published (do not guess).
4. CDL: copy from public stream graduate posts when published; keep `program` tag in `sourceMeta`.
5. Revisit Communitech/MaRS only if a free, dated cohort HTML page appears.

## Why not scrape

Cohort announcements are infrequent. Manual transcription is sustainable and avoids ToS / block risk.
