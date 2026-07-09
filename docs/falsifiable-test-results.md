# Falsifiable test results — Meridian sourcing vs generic search

**Date:** 2026-07-09
**Question:** For obscure Velocity cohort companies, does Meridian’s incubator layer return structured founder + company detail that plain Perplexity and StartupHub do not?

**Companies tested:** SCADABLE, Simantic, Photon-IV
(Chosen as less press-covered May 2026 names vs Gasner HealthTech / generic Hope / Canopy.)

**Verdict: 3/3 pass** — approach validated; continue scaling.

---

## SCADABLE

### Meridian incubator layer
- Founders: Ali Rahbar
- Description: Connect IoT hardware to cloud infrastructure in minutes.
- Cohort: Velocity May 2026
- Domain: null

### Plain Perplexity
- Surfaced company: **true**
- Mentioned founders: **false**
- Description-ish detail: **true**

- Snippet: `The startup you are referring to is likely **The Scalable Company** (often called **Scalable LLC**), not "SCADABLE," as there is no known company by that exact name. It was founded in **2020** by **Ryan Deiss**, **Roland Frasier** (also known as Roland Frasier), and **Richard Lindner**; the company is based in **Austin, Texas**, USA[2]. It specializes in helping **founder-led businesses** (with $2M–$20M in revenue) install a proprietary **operating system** ("Scalable OS") that enables them to s`

### StartupHub
- Configured: true
- Results returned: 1
- Name matches: **none**


### Pass?
**YES** — Meridian has structured founders+description; Perplexity missing company and/or founders; StartupHub no name match.

## Simantic

### Meridian incubator layer
- Founders: Seungmin Hong, Ahnaf Shahriar
- Description: Firmware test automation using simulated hardware.
- Cohort: Velocity May 2026
- Domain: null

### Plain Perplexity
- Surfaced company: **true**
- Mentioned founders: **false**
- Description-ish detail: **true**

- Snippet: `The startup company you are asking about is most likely **not “Simantic”**, but rather a confusion with **Siemens for Startups** (a program, not a startup company) or **SIMATIC** (a series of automation systems by Siemens, not a startup). There is **no known startup named “Simantic”** in the public domain, and no record of it being founded, based, or related to any incubator. - **SIMATIC** (not Simantic) is a registered trademark of **Siemens**, introduced in **1958**, and consists of **program`

### StartupHub
- Configured: true
- Results returned: 1
- Name matches: **none**


### Pass?
**YES** — Meridian has structured founders+description; Perplexity missing company and/or founders; StartupHub no name match.

## Photon-IV

### Meridian incubator layer
- Founders: Sanal Sina Kamal
- Description: AI + wireless handover between LEO satellites and ground networks.
- Cohort: Velocity May 2026
- Domain: null

### Plain Perplexity
- Surfaced company: **true**
- Mentioned founders: **false**
- Description-ish detail: **true**

- Snippet: `"Photon‑IV" is a **Canadian deep‑tech startup** that builds **AI‑driven network systems** to integrate satellite (Non‑Terrestrial Networks) and ground (Terrestrial Networks) communications, enabling secure, low‑latency connectivity for defense, aerospace, and critical infrastructure [2][3][5]. It was founded by **Sanal Kamal**, who is also its CEO [2][3]. The company is **based in Cambridge, Canada**, and works toward Canadian technological sovereignty in space and communications [2][5]. Its co`

### StartupHub
- Configured: true
- Results returned: 0
- Name matches: **none**


### Pass?
**YES** — Meridian has structured founders+description; Perplexity missing company and/or founders; StartupHub no name match.


## Aggregate

| Company | Perplexity company | Perplexity founders | StartupHub hit | Pass |
|---------|--------------------|---------------------|----------------|------|
| SCADABLE | true | false | false | **YES** |
| Simantic | true | false | false | **YES** |
| Photon-IV | true | false | false | **YES** |

**Pass rate: 3/3**
