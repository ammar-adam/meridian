# Meridian as a paid product — Deal Flow is the habit

## What funds pay for

Not memos. **Continuous Canadian community deal flow** against their mandate:
Velocity / DMZ / CDL / grants → coverage proof → founder reachability → Brief → pursue.

## Product loop

1. Choose fund + watch mandate (`/flow`)
2. See net-new / fresh cohort companies with **Pre-index** coverage + LinkedIn/email reach
3. Copy or Slack the **Monday digest**
4. Brief what matters → Share → Pursue → Thesis compounds

## Shipped

- Deal Flow feed + mandate watches + New/Fresh badges
- Coverage proof on every row (`lib/coverage-proof.js`)
- Founder reachability ≥70% on Flow-ready rows (`lib/reachability.js`)
- Digest card + `/api/digest` + Monday cron route `/api/cron/flow-digest` (external scheduler / Pro)
- Pilot proof page `/pilot` with measurable wedge stats
- Flow is Core nav primary; workflow Fund → Flow → Brief → Library → Thesis

## Ops to turn on

1. Vercel: `pk_live_` / `sk_live_` Clerk keys → confirm `clerkMode: production` → remove CSS hide
2. `SLACK_WEBHOOK_URL` + `CRON_SECRET` for Monday Slack digests
3. Optional `DIGEST_WATCHES` JSON for which mandates the cron watches

## Next (post-demo)

- Persist watches server-side (Neon) so digests aren’t only default Panache/Sagard
- Verified founder emails (not pattern guesses) via enrichment pass
- Live StartupHub miss badge refreshed nightly for new cohort names
