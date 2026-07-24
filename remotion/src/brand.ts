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
  accentSoft: "rgba(31, 77, 61, 0.09)",
  accentLine: "rgba(31, 77, 61, 0.28)",
  accentOn: "#ffffff",
  sidebar: "#111827",
  sidebarText: "#9aa3b5",
} as const;

/** Honest ballpark from prod debate — update if numbers move. */
export const stats = {
  companyRecords: 475,
  verifiedMisses: 70,
  entitiesChecked: 78,
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_FRAMES = FPS * 30; // 30s
