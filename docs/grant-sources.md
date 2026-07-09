# Grant recipient sources

## Finding: usable public source EXISTS

NRC / IRAP publishes **2024–25 Grants and Contributions** on the Open Government Portal:

- Dataset: https://open.canada.ca/data/dataset/9dd8056a-7c4c-4b4f-af98-80b01af6f010
- CSV: https://ftp.maps.canada.ca/pub/nrc_cnrc/Innovation_Innovation/2024_25_grants_and_contributions/2024_25_grants_and_contributions.csv
- Broader search UI: https://search.open.canada.ca/grants/

Fields include recipient legal/operating name, city, province, program name (IRAP Contributions to Firms / Organizations), agreement title, value, dates.

## What Meridian ships this sprint

`lib/sourcing/grant-adapter.js` uses a **manually curated seed** (`IRAP_GRANT_SEED`) sampled from that CSV — Ontario / tech-adjacent firm awards (e.g. Adviice, CircuitIQ, Gift Better, Stilo, Focal Healthcare, VizworX). This is not a live CSV ingest in the Discover request path (file is large / slow); refresh is manual.

## Refresh plan

1. Download the latest NRC IRAP CSV from the portal (annual / when updated).
2. Filter `Program Name` containing `Industrial Research Assistance Program` and `Contributions to Firms`.
3. Prefer recent `Agreement Start Date`, Ontario / Waterloo-adjacent cities, software/AI/fintech agreement titles.
4. Replace or extend `IRAP_GRANT_SEED` with 10–30 rows; keep `referenceNumber` for audit.
5. Do not invent founder names — leave `founderName` null unless separately known (entity resolver may fill).

## Not used

- Paid grant databases
- Scraping individual IRAP advisor pages
- Assuming SR&ED claim lists (not publicly listed per company in a convenient form)
