# Contributing to Meridian

## Branching policy

**All changes land on `main` through pull requests.** Direct pushes to `main` are blocked.

1. Create a branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/short-description
   ```
2. Make changes, commit, and push the branch.
3. Open a PR on GitHub targeting `main`.
4. Wait for **CI** (lint, unit tests, build) to pass.
5. Merge after review (or self-merge for solo work once checks are green).

Vercel creates a **preview deployment** for each PR. Production deploys when PRs merge to `main`.

## Local checks (run before pushing)

```bash
npm run test:unit    # fast unit tests
npm run lint
npm run build
npm run test:ci      # all three
```

Optional against production (needs network):

```bash
BASE_URL=https://meridian-stg.vercel.app npm run smoke
```

## CI/CD overview

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| [CI](.github/workflows/ci.yml) | Every PR + push to `main` | ESLint, Vitest unit tests, `next build` |
| [Deploy smoke](.github/workflows/deploy-smoke.yml) | Push to `main` (post-merge) | HTTP smoke against production |

Required status check for merge: **Lint, test, and build**.

### Enable branch protection (one-time, repo admin)

In GitHub → **Settings → Branches → Add rule** for `main`:

- Branch name pattern: `main`
- **Require a pull request before merging** (no direct pushes)
- **Require status checks to pass**: select `Lint, test, and build` (appears after the first CI run on a PR)
- Optional: **Require branches to be up to date before merging**

CLI (if `gh` is installed):

```bash
gh api repos/OWNER/REPO/branches/main/protection -X PUT \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]='Lint, test, and build' \
  -f enforce_admins=true \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -f restrictions=
```

## Test layout

```
tests/
  unit/           # Vitest — pure lib logic, no network
  integration/    # Vitest — production HTTP smoke (BASE_URL required)
  lib/            # shared smoke helpers
  helpers/        # test utilities (localStorage mock, etc.)
```

Add unit tests when changing:

- `lib/api-models.js`, `lib/anthropic.js` — model config and errors
- `lib/brief-url.js`, `lib/url-utils.js` — URL validation
- `lib/batch-utils.js` — batch state machine
- `lib/memo-library.js` — library ID guards
- `lib/quality-gate.js` — memo validation flags

## Environment secrets

Never commit `.env.local`. CI uses placeholder API keys for build only. Production keys live in Vercel.

## Questions

See [SETUP.md](SETUP.md) for local dev and [AGENTS.md](AGENTS.md) for architecture.
