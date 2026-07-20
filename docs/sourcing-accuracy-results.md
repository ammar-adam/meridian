# Sourcing accuracy check

**Date:** 2026-07-20
**Sample:** 9 entities across incubator / grant / domain_registry
**Method:** targeted Perplexity verification (exists? founder match?). Inconclusive is expected for stealth / thin web presence.

## Aggregate

| Verdict | Count |
|---------|-------|
| accurate | 2 |
| inaccurate | 1 |
| inconclusive | 5 |

**Accurate among decisive (accurate+inaccurate):** 0.667

## Per-entity

| Company | Source | Verdict | Notes |
|---------|--------|---------|-------|
| Innowind | incubator | **accruate** | Innowind (Velocity cohort) exists in Waterloo, ON, but founders are Hasan Kazmi and Rafat Jami, not the Norway founders listed in other records. |
| Eventist | incubator | **accurate** | Eventist is a Velocity incubator startup with founders Ciara Azam and Daniel Whitney operating at eventist.ca. |
| Applied Intelligence | incubator | **inconclusive** | Multiple 'Applied Intelligence' entities exist but none list Francois le Roux or Zaais van Zyl as founders. |
| Appfi | incubator | **inconclusive** | Company Appfi at appfi.dev exists but founders Aidan Dizaji and Shahdad Kompanizare are not listed in available sources. |
| Flomaru | incubator | **inaccurate** | Ali Shaverdi is confirmed founder, but Amal Aqel is not listed as a founder in any source. |
| ItemIQ | incubator | **accurate** | ItemIQ is a 2025-founded Canadian startup with co-founder Saad Khan confirmed on LinkedIn; Arhem Rana is not listed in the search results. |
| Focal Healthcare Inc. | grant | **inconclusive** | The company Focal Healthcare Inc. exists and received IRAP funding, but the query does not specify a founder name to verify for a match. |
| Adviice Inc. | grant | **inconclusive** | No search results confirm Adviice Inc.'s existence or founder details despite the IRAP claim. |
| Stilo Corporation | grant | **inconclusive** | Stilo Corporation exists per a 2023 ownership change notice, but IRAP eligibility requires a Canadian SME while the record lacks confirmation of Canadian incorporation or founder details. |

## Interpretation

- High **inconclusive** on incubator/grant rows without public founders is expected.
- **Perplexity typos / false-negatives:** treat Velocity cohort pages as higher trust than a single Perplexity “inaccurate” when founders appear on the public cohort page.
- **Domain registry** sample skipped this run (Corporations Canada fetch failed in CI/local network). Unit tests cover foundation/brand-collision filters.
- Trust posture for Discover: **fully enriched incubator OK to surface first**; **domain_registry** remains amber / low confidence.
- Mentor demo golden set (SCADABLE, Simantic, Photon-IV): falsifiable **3/3** — structured founders+domain; StartupHub name-blind.
