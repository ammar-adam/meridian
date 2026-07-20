# Falsifiable test results — Meridian sourcing vs generic search

**Date:** 2026-07-20
**Question:** For Velocity cohort companies, does Meridian return **structured** founder + domain + description that StartupHub name-search still misses — without a live research round-trip?

**Pass criterion (updated 2026-07-20):** Meridian has founders + description + domain **and** StartupHub returns no name match. Targeted Perplexity “who founded X?” queries may succeed once the name is known; that does not replace cohort aggregation across Velocity / DMZ / CDL.

**Companies tested:** SCADABLE, Simantic, Photon-IV
(Chosen as less press-covered May 2026 names vs Gasner HealthTech / generic Hope / Canopy.)

**Verdict: 3/3 pass** — approach validated; continue scaling.

---

## SCADABLE

### Meridian incubator layer
- Founders: Ali Rahbar
- Description: Connect IoT hardware to cloud infrastructure in minutes.
- Cohort: Velocity May 2026
- Domain: scadable.com

### Plain Perplexity (targeted query)
- Surfaced company: **true**
- Mentioned founders: **true**
- Description-ish detail: **true**

- Snippet: `**SCADABLE** (styled as SCADABLE) is a Canadian startup that provides an **AI-powered compliance and developer platform** for connected hardware, acting as a “functional compliance unit” that automates security, IoT infrastructure, and regulatory proof for hardware teams. It was founded by **Ali Rahbar**, who serves as the **Founder & Technical Lead**, and the company is **based in Toronto, Ontario, Canada** (with a registered service address at 706 Brookmill Pl). ### Key Details | Attribute |`

### StartupHub
- Configured: true
- Results returned: 1
- Name matches: **none**


### Pass?
**YES** — structured founders+domain+description AND StartupHub no name match.

## Simantic

### Meridian incubator layer
- Founders: Seungmin Hong, Ahnaf Shahriar
- Description: Firmware test automation using simulated hardware.
- Cohort: Velocity May 2026
- Domain: simantic.dev

### Plain Perplexity (targeted query)
- Surfaced company: **true**
- Mentioned founders: **true**
- Description-ish detail: **true**

- Snippet: `**Simantic** is a startup company founded in 2025 that builds a **firmware test automation platform** using **simulated hardware**, allowing embedded teams to test complex systems in CI without physical devices. | Attribute | Details | | :--- | :--- | | **Founders** | **Seungmin Hong** (CEO) and **Ahnaf Shahriar** [1][2][3][7] | | **Location** | **Waterloo, Ontario, Canada** (HQ); also hiring for a hybrid role in San Francisco [2][7][9] | | **Core Product** | A **simulation-based platform** tha`

### StartupHub
- Configured: true
- Results returned: 1
- Name matches: **none**


### Pass?
**YES** — structured founders+domain+description AND StartupHub no name match.

## Photon-IV

### Meridian incubator layer
- Founders: Sanal Sina Kamal
- Description: AI + wireless handover between LEO satellites and ground networks.
- Cohort: Velocity May 2026
- Domain: photon-iv.com

### Plain Perplexity (targeted query)
- Surfaced company: **true**
- Mentioned founders: **true**
- Description-ish detail: **true**

- Snippet: `**Photon‑IV** is a Canadian deep‑tech startup that builds **AI‑driven satellite communication systems** to enable seamless, secure handover between **Non‑Terrestrial Networks (NTN)**—such as LEO satellites—and **Terrestrial Networks (TN)** for defense, aerospace, and critical infrastructure [1][2][5]. ### Key Details | Attribute | Information | |-----------|-------------| | **Founder** | **Sanal Sina Kamal** (also known as Sanal Kamal), who serves as Founder and CEO [2][5] | | **Location** | B`

### StartupHub
- Configured: true
- Results returned: 1
- Name matches: **none**


### Pass?
**YES** — structured founders+domain+description AND StartupHub no name match.


## Aggregate

| Company | Perplexity company | Perplexity founders | StartupHub hit | Pass |
|---------|--------------------|---------------------|----------------|------|
| SCADABLE | true | true | false | **YES** |
| Simantic | true | true | false | **YES** |
| Photon-IV | true | true | false | **YES** |

**Pass rate: 3/3**

### Mentor-demo takeaway
Use StartupHub-blind + structured cohort rows as the spoken accuracy foil. Do not claim Perplexity can never find founders when asked by name.
