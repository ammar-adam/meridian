# Meridian — Remotion brand kit

Brand tokens for the investor demo video. Matches `app/globals.css` — **Quiet capital**: cool stone canvas, ink sidebar, deep pine accent. No neon glow, no kraft paper.

## Canvas

| Use case | Size | FPS |
|----------|------|-----|
| Hero / product shots | **1920×1080** | 30 |
| LinkedIn / Twitter clip | **1080×1080** or **1080×1920** | 30 |
| Full walkthrough | **1920×1080** | 30 |

Record the live app at **1920×1080** browser width. Light product chrome drops into a light Remotion timeline; dark sidebar provides contrast without neon.

## Typography

| Role | Font | Weight | Size (1080p) |
|------|------|--------|--------------|
| Display / brand | Instrument Serif | 400 | 64–88px |
| H1 (section) | Instrument Serif | 400 | 28–32px |
| Body / UI | IBM Plex Sans | 400–600 | 14–16px |
| Labels / receipts | IBM Plex Mono | 500 | 11–12px |
| Kicker | IBM Plex Sans | 500 | 11px uppercase, tracking 0.16em, pine |

```tsx
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
```

## Color palette

```tsx
export const brand = {
  bg: "#f2f3f5",
  bgSubtle: "#e9ebef",
  surface: "#ffffff",
  surface2: "#f7f8fa",
  surface3: "#eceef2",

  border: "rgba(15, 23, 42, 0.09)",
  borderStrong: "rgba(15, 23, 42, 0.18)",

  text: "#0f172a",
  muted: "#5b6475",
  muted2: "#8b93a7",

  accent: "#1f4d3d",
  accentHover: "#163a2e",
  accentSoft: "rgba(31, 77, 61, 0.09)",
  accentLine: "rgba(31, 77, 61, 0.28)",
  accentOn: "#ffffff",

  sidebar: "#111827",
  sidebarText: "#9aa3b5",
};
```

### Logo mark

- 32×32 rounded square (`border-radius: 6px`)
- Flat pine `#1f4d3d` fill
- Letter **M**, white, 13px bold
- No glow

## Signature effects (use sparingly)

| Effect | Recipe |
|--------|--------|
| Landing wash | Cool gray linear `#e8eaef → #f2f3f5` + soft pine radial at 7% opacity |
| Grain | Fractal-noise SVG at ~3.5% opacity |
| Product frame | White surface, 1px slate border, soft shadow `0 28px 56px rgba(15,23,42,0.12)` |
| Evidence chip | Pine soft fill + pine line border, mono 9–11px |

Avoid: emerald neon glow, aurora orbs, grid overlays, purple gradients, cream/oxblood dossier looks.

## Key screens for the film

1. **Landing** (`/`) — brand-first hero + Deal Flow product frame
2. **Deal Flow** (`/flow`) — ink sidebar + light table with proof chips
3. **Brief** (`/brief`) — URL → generating steps
4. **Memo** (`/memo`) — white one-pager artifact + Pursue/Pass
5. **Coverage proof** (`/pilot`) — ledger stats

## Motion cues

- Row stagger: **40ms**
- Fade-in: **350ms** ease-out
- Rise-in: **400ms** cubic-bezier(0.22, 1, 0.36, 1)
- No pulse dots or glow sweeps on camera

## Honest on-screen numbers

Only show metrics from prod at record time. Run `./scripts/demo-preflight.sh` and `npm run debate` before filming.

## Export settings

- Codec: H.264
- CRF: 18–20 for crisp UI text
- Audio: voiceover separate; Remotion for b-roll and transitions
