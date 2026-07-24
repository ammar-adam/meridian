# Meridian — SF demo flow + video plan

Two deliverables: (1) a 5-minute live walkthrough you narrate on Loom / in the
room, and (2) a 30-second Remotion hype teaser. The walkthrough sells the
*value*; the teaser earns the click.

---

## 0. Pre-flight (do this 60 seconds before you record)

1. Open `https://meridian-stg.vercel.app/` and **hard refresh** (Ctrl+Shift+R).
   Wait ~3 seconds after load before clicking anything — the app hydrates
   Clerk in the background. (Landing CTAs are native links now, so they fire
   instantly, but giving it a beat keeps the in-app nav snappy on camera.)
2. Confirm the sidebar shows **Panache Ventures · First check** as the active
   firm/vehicle. If not, pick it from the Firm dropdown in the sidebar.
3. Have one company brief already generated (e.g. SCADABLE) so you never wait
   on a live scrape during the demo. If the Library is empty, generate one
   before recording.
4. Close other tabs. Zoom browser to ~110% so text is readable on video.

---

## 1. The 5-minute walkthrough (ordered)

Narrate the **problem → wedge → loop → proof → value**. Click in this order.

### Beat 1 — Landing / the problem (0:00–0:40)
- **Screen:** the dark landing page.
- **Say:** "Early-stage funds are judged on how many good companies they see.
  Today an analyst manually trawls accelerator pages, LinkedIn, and grant lists.
  Meridian turns your thesis into continuous, sourced deal flow — with receipts."
- **Do:** point at the three proof stats (3× / 50+ / <60s). Then click
  **Open Deal Flow**.

### Beat 2 — Fund context / "configure once" (0:40–1:10)
- **Screen:** the workspace, sidebar visible.
- **Say:** "First you tell Meridian who you are. I'm running as Panache
  Ventures, investing out of the first-check vehicle."
- **Do:** open the **Firm** dropdown in the sidebar and switch to
  **Sagard AI Fund**, then switch the **vehicle** (First check → Follow-on),
  then switch back to Panache. This proves multi-fund / multi-strategy — the
  thing they'll ask "does it work for my firm?".

### Beat 3 — Deal Flow / the wedge (1:10–2:20)
- **Screen:** `/flow` with ranked companies.
- **Say:** "This is what you open every Monday. These are net-new Canadian
  companies pulled from community sources — Velocity, DMZ, CDL, IRAP grants —
  ranked against Panache's mandate. Every row carries **provenance**: where we
  found it, when we first saw it, and — where we checked — whether the big
  indexes had it at that time. That's the receipt. It's not a Crunchbase scrape."
- **Do:** hover a fit score to show *why* it matched. Point at the source chip
  (e.g. "Velocity") and the founder/domain columns.

### Beat 4 — Brief / the forwardable artifact (2:20–3:30)
- **Screen:** click a company → its brief / memo.
- **Say:** "One click turns any company into a fund-native one-pager — thesis
  band, product, funding, team — written to *our* mandate, not a generic
  summary. This is the thing an analyst forwards to a partner."
- **Do:** scroll the memo. Call out the thesis band matching Panache's mandate.
  If a section shows a verify banner, say: "and it's honest — it flags what it
  couldn't confirm instead of hallucinating."

### Beat 5 — Decide / the learning loop (3:30–4:10)
- **Screen:** the memo's Pursue / Pass controls, then `/thesis`.
- **Say:** "You pursue or pass right here. Every decision and every edit teaches
  Meridian your real thesis."
- **Do:** hit **Pursue**, then open the **Thesis** tab to show pursue rate /
  thesis corrections. "Over a few weeks this becomes your fund's memory."

### Beat 6 — Proof / credibility (4:10–4:45)
- **Screen:** `/pilot` (Coverage proof).
- **Say:** "And we can measure the wedge. Here are dated cases where Meridian
  had a company before the mainstream indexes did — that's the earliness claim,
  and it's falsifiable."

### Beat 7 — Close / the value (4:45–5:00)
- **Say:** "The point isn't saving analyst time. It's deal velocity — a fund
  looks at 3× more companies a week without adding headcount. That's what
  you're buying."

**Golden rule:** always be answering "so what does the fund get?" — velocity,
receipts, and a memory. Never narrate the UI ("now I click here"); narrate the
*value* the click produces.

---

## 2. Why this is buyable (your talking points if pushed)

- **Wedge is data, not UI:** community/incubator provenance + dated index-miss
  proof is something Crunchbase/PitchBook structurally don't have for the
  earliest Canadian companies.
- **It's a habit, not a tool:** Deal Flow is a Monday-morning reason to open it.
- **It compounds:** pursue/pass + edits make each fund's instance smarter.
- **It's honest:** confidence flags instead of hallucinated certainty — critical
  for an investment audience.

---

## 3. Remotion 30-second teaser — proposed flow

The current cut is too "app footage with three words." Fix: make it a
**narrative** where the app is the *evidence*, not the subject. Voice/caption
carries a 4-line story; the product only appears to *prove* each line.

| Time | Caption (on screen) | Visual |
|------|---------------------|--------|
| 0–4s | "Your next deal is already public." | Black screen, one line of Instrument Serif fades in over the ethereal gradient. |
| 4–9s | "It's on an accelerator page nobody's reading." | Quick montage: Velocity / DMZ / CDL / IRAP wordmarks flickering past, dimmed. |
| 9–16s | "Meridian reads them for you — with receipts." | The Deal Flow table assembles row by row (reuse the `m-magic-table` row-in animation), source chips + dated provenance highlighted. |
| 16–23s | "Thesis in. Forwardable brief out. Under a minute." | A row → one-pager brief snaps into frame; thesis band underlines. |
| 23–28s | "See 3× more companies. Same team." | The three proof stats count up: 3× / 50+ / <60s. |
| 28–30s | "Meridian. Community deal flow, with receipts." | Logo lockup on black, mint accent underline. |

**Rules for the teaser:**
- One idea per beat; the caption is the hero, the product clip is the proof.
- Keep the palette identical to the new landing (near-black, mint `#9fe3c0`,
  Instrument Serif). Cohesion with the live site = credibility.
- No more than ~6 words per caption. Cut on the beat.
- End on the exact tagline the landing uses so the teaser → site handoff is seamless.

Render: `cd remotion; npm run render` → `remotion/out/meridian-teaser.mp4`.
