# Meridian — Remotion brand kit

Use this when building a Remotion composition for the investor demo. Tokens match `app/globals.css` after the SaaS UI refresh.

## Canvas

| Use case | Size | FPS |
|----------|------|-----|
| Hero / product shots | **1920×1080** | 30 |
| LinkedIn / Twitter clip | **1080×1080** or **1080×1920** | 30 |
| Full walkthrough | **1920×1080** | 30 |

Record the live app at **1920×1080** browser width for pixel-perfect parity, or rebuild screens in Remotion using the tokens below.

## Typography

| Role | Font | Weight | Size (1080p) |
|------|------|--------|--------------|
| Display | Plus Jakarta Sans | 700 | 64px |
| H1 (page title) | Plus Jakarta Sans | 600 | 32px |
| Body | Plus Jakarta Sans | 400 | 16–17px |
| Labels / stats | JetBrains Mono | 500 | 11–12px |
| Kicker | Plus Jakarta Sans | 500 | 11px uppercase, tracking 0.14em |

Google Fonts import (Remotion):

```tsx
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
```

## Color palette

```tsx
export const brand = {
  bg: "#f8fafc",
  bgSubtle: "#f1f5f9",
  surface: "#ffffff",
  surface2: "#f8fafc",
  border: "rgba(15, 23, 42, 0.08)",
  text: "#0f172a",
  muted: "#64748b",
  muted2: "#94a3b8",
  accent: "#4f46e5",
  accentHover: "#4338ca",
  accentSoft: "rgba(79, 70, 229, 0.1)",
  success: "#047857",
  successSoft: "rgba(16, 185, 129, 0.08)",
  successBorder: "rgba(16, 185, 129, 0.25)",
};
```

### Logo mark

- 32×32 rounded square (`border-radius: 8px`)
- Gradient: `#4f46e5` → `#6366f1`
- Letter **M**, white, 13px bold
- Shadow: `0 2px 8px rgba(79, 70, 229, 0.25)`

## Key screens for the film

Recommended beat order (matches `docs/investor-demo-film.md`):

1. **Landing** (`/`) — light hero + product frame preview
2. **Deal Flow** (`/flow`) — mandate stats pills + company table
3. **Brief** (`/brief`) — URL input → generating state
4. **Memo** (`/memo`) — one-pager + Pursue/Pass
5. **Coverage proof** (`/pilot`) — ledger headline metrics

## UI components to mirror

| CSS class | Remotion equivalent |
|-----------|---------------------|
| `.m-product-frame` | White card, 1px border, `box-shadow: 0 24px 80px rgba(15,23,42,0.12)` |
| `.m-stat-pill` | Rounded-full, mono 11px, white bg, slate border |
| `.m-stat-pill-accent` | Indigo soft bg + border |
| `.m-stat-pill-success` | Emerald soft bg + border |
| `.m-btn-primary` | Indigo `#4f46e5`, white text, 13px medium |
| `.m-badge-high` | Emerald pill for fit scores ≥80 |

## Sidebar layout (workspace)

- Width: **248px**
- Background: white
- Active nav: `rgba(79, 70, 229, 0.08)` bg, `#4338ca` text
- Main content bg: `#f8fafc` (slate-50)

## Motion cues (optional)

Match in-app magic demo timing for table reveals:

- Row stagger: **40ms** between rows
- Fade-in: **350ms** ease-out
- Rise-in: **450ms** cubic-bezier(0.22, 1, 0.36, 1)

## Honest on-screen numbers

Only show metrics that exist in prod at record time. Run `./scripts/demo-preflight.sh` and `npm run debate` before filming. Do not animate fake corpus sizes or index coverage claims.

## Export settings

- Codec: H.264
- CRF: 18–20 for crisp UI text
- Audio: record voiceover separately; Remotion for b-roll and transitions
