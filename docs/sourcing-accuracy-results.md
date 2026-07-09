# Sourcing accuracy check

**Date:** 2026-07-09
**Sample:** 13 entities across incubator / grant / domain_registry
**Method:** targeted Perplexity verification (exists? founder match?). Inconclusive is expected for stealth / thin web presence.

## Aggregate

| Verdict | Count |
|---------|-------|
| accurate | 3 |
| inaccurate | 5 |
| inconclusive | 5 |

**Accurate among decisive (accurate+inaccurate):** 0.375

## Per-entity

| Company | Source | Verdict | Notes |
|---------|--------|---------|-------|
| Innowind | incubator | **accurate** | Innowind is a real company in the 2026 Velocity cohort improving wind energy with AI-controlled robotic fins. |
| Eventist | incubator | **accurate** | Multiple sources confirm Eventist exists and was co-founded by Ciara A. and Daniel Whitney. |
| Applied Intelligence | incubator | **inaccurate** | No startup named Applied Intelligence exists; the term refers to a concept or course, not a company. |
| Appfi | incubator | **accurate** | Appfi is explicitly listed as a Velocity company building iPhone apps without coding. |
| Flomaru | incubator | **inaccurate** | Company Flomaru exists but founder names Ali Shaverdi and Amal Aqel do not match the actual founder Ali Shaverdi only. |
| ItemIQ | incubator | **inconclusive** | Company ItemIQ is verified but founder names are not confirmed in the provided sources. |
| Focal Healthcare Inc. | grant | **inconclusive** | Company is verified as a real Canadian medical device firm but founder identity cannot be confirmed from available data. |
| Adviice Inc. | grant | **inconclusive** | Company verified via public website and IRAP funding criteria but founder identity not disclosed. |
| Stilo Corporation | grant | **inconclusive** | The company and ownership change are verified, but startup due diligence cannot be confirmed without project details. |
| DataCore Tech Corp. | domain_registry | **inaccurate** | The claim conflicts with the established DataCore Software founded in 1998, not a 2024 entity. |
| Doris Baird Foundation | domain_registry | **inaccurate** | No verified organization named 'Doris Baird Foundation' exists; the deceased Doris Baird's obituary is from 2011, and the only similar entity is the established Baird Foundation Inc (1967). |
| Ekai Technolabs Inc. | domain_registry | **inaccurate** | The claimed company is an Inc. entity incorporated in 2023, but the only matching ZaubaCorp record is an LLP entity incorporated in 2017 and struck off. |
| AIMSTONE CAPITAL INC. | domain_registry | **inconclusive** | unparseable response |

## Interpretation

- High **inconclusive** on incubator/grant rows without public founders is expected.
- **Important:** Perplexity labeled **Applied Intelligence** and **Flomaru** founders as inaccurate/missing — but both appear on Velocity’s public Feb 2026 cohort pages (Flomaru founders Ali Shaverdi + Amal Aqel on velocityincubator.com/company/flomaru). This is the same failure mode the falsifiable test measured: generic search under-attributes early Velocity companies. Treat incubator transcription as higher trust than Perplexity “inaccurate” when the cohort page is the provenance.
- **Domain registry** produced real noise: charity/foundation names and brand collisions (e.g. DataCore). Mitigation shipped: filter names matching foundation/church/society/etc., and do **not** run entity-resolution Perplexity on registry rows (high volume, low confidence).
- Trust posture for Discover: **incubator + grant OK to surface with provenance**; **domain_registry** remains low-confidence / amber badge and needs thesis ranking + human skim — not “trust without review.”
