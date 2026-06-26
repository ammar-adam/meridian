/** Client-safe feature flags (set in .env.local / Vercel) */
export const FEATURES = {
  serverPdf: process.env.NEXT_PUBLIC_MERIDIAN_SERVER_PDF === 'true',
  shareLinks: process.env.NEXT_PUBLIC_MERIDIAN_SHARE_LINKS === 'true',
}

export const PIPELINE_TIMEOUT_MS = 300_000

export const BETA_TARGETS = {
  briefs: 10,
  pursue: 3,
  gpForwardRate: 0.5,
}
