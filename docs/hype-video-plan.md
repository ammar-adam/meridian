# Meridian hype video — script & shot plan

**Demo firm (locked):** Meridian Ventures (fictional)  
**Staging:** https://meridian-stg.vercel.app  
**Record:** Loom over live product (preferred). Remotion is optional polish — do not block on a full render.  
**Vision spine:** [meridian-vision.md](./meridian-vision.md) — near-term school→mandate; long-run founder→VC talent only at the close.

---

## Framing (hard rules)

| Do | Don’t |
|----|--------|
| Lead with school ecosystems → fund mandates + deal velocity with receipts | Lead with “Tier-1 Canada / US / UK” as the brand hook |
| Show **real staging UI** with **Meridian Ventures** claimed | Use Panache (or any real fund) as the hero firm |
| End ~10s product value + ~5s long-run manifesto | Oversell talent programs / fellowships as shipped |
| Max **3 supers** total | Agent-platform hype, full-coverage claims |

**Geography:** may appear once as supporting detail (“coverage starts in CA / US / UK and expands”) — never as the slogan.

---

## Preflight (before record)

1. Hard refresh https://meridian-stg.vercel.app (Ctrl/Cmd+Shift+R after deploy).
2. Clear prior firm if needed: DevTools → Application → Local Storage → clear `meridian_*` keys, reload.
3. Sign in path below so chrome shows **Meridian Ventures**.
4. Confirm `/flow` has rows; optional warm: brief one domain into Library.
5. Optional: open `/schools` once so Scout / registry isn’t cold.

---

## Exact clicks — claim Meridian Ventures

| Step | Action |
|------|--------|
| 1 | Open https://meridian-stg.vercel.app |
| 2 | Click **Sign in →** (lands on `/welcome?next=/flow`) |
| 3 | Investor type: **Venture fund** |
| 4 | Firm name: `Meridian Ventures` |
| 5 | Focus / mandate: `Pre-seed technical founders from university ecosystems` |
| 6 | Geography (optional): `Canada, US, UK` |
| 7 | Submit → lands on **Deal Flow** with Meridian Ventures active |

If already claimed under another name: clear localStorage firm keys, hard refresh, repeat.

---

## Length options

Prefer **45s** for mentor send. Use **30s** if Loom must stay tight; **~60s** if you want Schools Scout + full Brief drafting on camera.

| Cut | Structure |
|-----|-----------|
| **30s** | Welcome/claim → Flow → Brief hold → 8s product close + 4s manifesto |
| **45s** | Landing → Welcome → Schools glance → Flow → Brief → 10s product + 5s manifesto |
| **~60s** | Full path with Waterloo Scout + thesis-band drafting on Brief |

---

## Supers (max 3 — use across any cut)

1. `School ecosystems → fund mandates`
2. `Deal velocity · with receipts`
3. `Dated. Sourced. Brief-ready.`  
   *(Close only — optional fourth beat is VO-only manifesto, no fourth super.)*

---

## 45-second cut (primary — paste-ready)

**B-roll path:** `/` → `/welcome` (claim Meridian Ventures) → `/schools` → `/flow` → Brief one row → hold memo → manifesto line.

| Time | Shot (live staging) | VO | Super |
|------|---------------------|----|-------|
| **0:00–0:05** | Landing — brand + eyebrow; cursor toward **Sign in** | “Meridian connects school ecosystems to fund mandates.” | **1** |
| **0:05–0:12** | `/welcome` — type **Meridian Ventures** + mandate; submit | “Claim your firm. We match campus deal flow to what you actually invest in.” | — |
| **0:12–0:20** | `/schools` — registry visible; optional Scout Waterloo (don’t narrate Tier-1 as the product) | “Campus ecosystems — incubators, cohorts, founders — dated and sourced.” | — |
| **0:20–0:30** | `/flow` as Meridian Ventures; point founders + provenance badges; click **Brief** on a domain-ready row | “Ranked to your mandate. Brief with receipts — nothing we can’t defend.” | **2** |
| **0:30–0:40** | Memo / thesis band drafting or finished one-pager; hold product | “More of the right companies per week. Deal velocity — not another chat tool.” | **3** |
| **0:40–0:45** | Soft pull to brand / landing CTA, or hold memo with VO only | “Long run: the same graph feeds founder recirculation into VC talent programs — portfolio hiring, fellowships — when the coverage layer earns it.” | — *(no 4th super)* |

---

## 30-second cut (tight)

| Time | Shot | VO | Super |
|------|------|----|-------|
| **0:00–0:04** | Landing eyebrow + headline | “School ecosystems → fund mandates.” | **1** |
| **0:04–0:10** | Welcome → submit Meridian Ventures | “Claim the firm. Match campus companies to the mandate.” | — |
| **0:10–0:20** | Flow rows (founders + provenance) → Brief | “Dated. Sourced. Brief-ready.” | **2** + **3** (flip at 0:16) |
| **0:20–0:26** | Hold memo | “Deal velocity, with receipts.” | — |
| **0:26–0:30** | Brand / CTA | “Long run: failed and former founders feeding VC talent programs — same graph, later chapter.” | — |

---

## ~60-second cut (full product)

| Time | Shot | VO | Super |
|------|------|----|-------|
| **0:00–0:06** | Landing | “Meridian connects school ecosystems to fund mandates.” | **1** |
| **0:06–0:14** | Welcome → Meridian Ventures claimed | “Sign in. Name the firm. Set the thesis.” | — |
| **0:14–0:24** | Schools → Scout Waterloo → job log tick | “We watch campus ecosystems continuously — coverage compounds; geography expands.” | — |
| **0:24–0:38** | Flow (Meridian Ventures) → filter / scroll → Brief | “Match to the mandate. Founders and provenance on every row.” | **2** |
| **0:38–0:50** | Brief drafting → thesis band → forwardable page | “URL to a one-pager your team can forward — with receipts.” | **3** |
| **0:50–0:55** | Hold product / proof strip if visible | “The point isn’t saving analyst time. It’s looking at more of the right companies.” | — |
| **0:55–1:00** | Brand hold | “Long run: founder recirculation into VC talent programs — portfolio hiring, fellowships — built on the same mandate-native graph.” | — |

---

## Closing VO blocks (copy-paste)

**Product close (~10s):**  
“Meridian matches campus companies to your mandate — founders, provenance, dated proof. Deal velocity, with receipts.”

**Manifesto (~5s — vision only):**  
“Long run: failed and former founders feed back into VC talent programs — portfolio hiring, fellowships, scout tracks. Same graph. Later chapter.”

Do **not** say “we place talent today” or show a fake jobs UI.

---

## Hard don’ts (on camera)

- Panache, Sagard, or any real fund as the claimed firm
- “We cover all Tier-1” / Tier-1 as the opening hook
- “AI agent platform”
- PitchBook / Harmonic replacement claims
- Invented stats not visible on `/pilot`
- Selling talent programs as shipped product

---

## Remotion note

`remotion/src/Teaser.tsx` copy should say **Meridian Ventures** (not Panache). Full re-render is optional; Loom over staging is the mentor deliverable.
