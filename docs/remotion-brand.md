# Meridian — Remotion brand kit

Brand tokens for the investor demo video. Matches `app/globals.css` — the **Deal Intelligence Terminal** aesthetic: cinematic near-black canvas, emerald signal accent (verified / early / go), glass depth, glow.

## Canvas

| Use case | Size | FPS |
|----------|------|-----|
| Hero / product shots | **1920×1080** | 30 |
| LinkedIn / Twitter clip | **1080×1080** or **1080×1920** | 30 |
| Full walkthrough | **1920×1080** | 30 |

Record the live app at **1920×1080** browser width for pixel-perfect parity. The app is dark by default, so screenshots drop straight into a dark Remotion timeline with no reframing.

## Typography

| Role | Font | Weight | Size (1080p) |
|------|------|--------|--------------|
| Display / brand | Plus Jakarta Sans | 700 | 64–76px |
| H1 (page title) | Plus Jakarta Sans | 600 | 32px |
| Body | Plus Jakarta Sans | 400 | 16–17px |
| Labels / stats / receipts | JetBrains Mono | 500 | 11–12px |
| Kicker | Plus Jakarta Sans | 500 | 11px uppercase, tracking 0.18em, emerald |

The landing brand wordmark uses a white → 70%-white vertical gradient clip. Recreate in Remotion with a `linear-gradient(180deg, #fff 40%, rgba(255,255,255,0.7))` text clip.

```tsx
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
```

## Color palette

```tsx
export const brand = {
  // Canvas
  bg: "#07080b",
  bgSubtle: "#0a0c11",
  surface: "#0f1218",
  surface2: "#14171f",
  surface3: "#1c2029",

  // Lines
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.16)",

  // Text
  text: "#f2f4f8",
  muted: "#9aa1b0",
  muted2: "#656b7a",

  // Signal accent — emerald
  accent: "#10b981",
  accentHover: "#34d399",
  accentDeep: "#041c14",       // text on emerald buttons
  accentSoft: "rgba(16, 185, 129, 0.12)",
  accentGlow: "rgba(16, 185, 129, 0.35)",
  accentText: "#6ee7b7",       // emerald text on dark

  // Secondary signal colors (badges)
  sky: "#7dd3fc",              // "Fresh"
  amber: "#fcd34d",            // caution / needs verification
  violet: "#c4b5fd",           // signal-based
};
```

### Logo mark

- 32×32 rounded square (`border-radius: 8px`)
- Gradient: `#10b981` → `#34d399`
- Letter **M**, deep-green text `#04140d`, 13px bold
- Glow: `0 0 0 1px rgba(16,185,129,0.3), 0 4px 16px rgba(16,185,129,0.35)`

## Signature effects (recreate in Remotion b-roll)

| Effect | Recipe |
|--------|--------|
| Aurora background | Radial emerald gradient from top-center + teal top-right + blue bottom-left over `#07080b` |
| Grid overlay | 56px lines at `rgba(255,255,255,0.035)`, radial mask fading to edges |
| Grain | Fractal-noise SVG at 25% opacity, `mix-blend-mode: overlay` |
| Floating orbs | Blurred emerald/teal circles, 16s ease-in-out drift loop |
| Emerald glow | Button/card shadow `0 8px 32px rgba(16,185,129,0.3)` |
| Product frame glow | `-inset-8` blurred gradient behind the app frame |

## Key screens for the film

Recommended beat order (matches `docs/investor-demo-film.md`):

1. **Landing** (`/`) — dark aurora hero + glowing product frame preview
2. **Deal Flow** (`/flow`) — emerald stat pills + company table with proof chips
3. **Brief** (`/brief`) — URL input → generating steps (emerald)
4. **Memo** (`/memo`) — white "paper" one-pager on dark desk + Pursue/Pass bar
5. **Coverage proof** (`/pilot`) — ledger headline stats + falsifiable coverage table

> **Note:** the memo document body renders as intentional white "paper" (it's the artifact you forward/print). That contrast against the dark app is a feature — frame it like a document on a desk.

## UI component recipes

| CSS class | Remotion equivalent |
|-----------|---------------------|
| `.m-product-frame` | `#0f1218` card, 1px white/8 border, `box-shadow: 0 40px 120px rgba(0,0,0,0.65)` |
| `.m-stat-pill` | Rounded-full, mono 11px, `#14171f` bg, white/8 border |
| `.m-stat-pill-accent` / `-success` | Emerald soft bg `rgba(16,185,129,0.1)`, emerald-300 text |
| `.m-btn-primary` / `.m-btn-glow` | Emerald `#10b981`, `#041c14` text, emerald glow |
| `.m-badge-high` | Emerald pill for fit scores ≥80 |
| Proof chip "Not in index" | Emerald 400/10 bg, emerald-200 text, emerald border |

## Workspace layout

- Sidebar width: **248px**, background `#0a0c11`
- Active nav: `rgba(16,185,129,0.1)` bg, `#6ee7b7` text, inset emerald ring
- Header/topbar: `#0f1218`
- Main content bg: `#07080b`

## Motion cues (match in-app magic demo)

- Row stagger: **40ms** between rows
- Fade-in: **350ms** ease-out
- Rise-in: **450ms** cubic-bezier(0.22, 1, 0.36, 1)
- Pulse dot (live indicator): **1.6s** ease-in-out, opacity 1 ↔ 0.45
- Loader bar: emerald sweep, 1.1s loop

## Honest on-screen numbers

Only show metrics that exist in prod at record time. Run `./scripts/demo-preflight.sh` and `npm run debate` before filming. Do not animate fake corpus sizes or index coverage claims — the emerald "verified" language only holds if the ledger backs it.

## Export settings

- Codec: H.264
- CRF: 18–20 for crisp UI text on dark (banding shows more on dark gradients — keep CRF low)
- Audio: record voiceover separately; use Remotion for b-roll, transitions, and stat callouts
