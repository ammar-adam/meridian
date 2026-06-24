# Meridian cloud setup — Neon + Clerk + Vercel env
# Run from repo root: .\scripts\setup-cloud.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "`n=== Meridian Cloud Setup ===" -ForegroundColor Cyan
Write-Host "You need accounts at: https://neon.tech and https://dashboard.clerk.com`n"

# 1. Collect credentials
$databaseUrl = Read-Host "Paste Neon DATABASE_URL (postgresql://...)"
$clerkPk = Read-Host "Paste Clerk Publishable Key (pk_test_... or pk_live_...)"
$clerkSk = Read-Host "Paste Clerk Secret Key (sk_test_... or sk_live_...)"

if (-not $databaseUrl -or -not $clerkPk -or -not $clerkSk) {
  Write-Host "All three values are required." -ForegroundColor Red
  exit 1
}

# 2. Merge into .env.local (preserve existing API keys)
$envPath = Join-Path $root ".env.local"
$existing = @{}
if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $existing[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
}

$existing["DATABASE_URL"] = $databaseUrl
$existing["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] = $clerkPk
$existing["CLERK_SECRET_KEY"] = $clerkSk
$existing["NEXT_PUBLIC_CLERK_SIGN_IN_URL"] = "/sign-in"
$existing["NEXT_PUBLIC_CLERK_SIGN_UP_URL"] = "/sign-up"
$existing["MERIDIAN_ENABLE_SERVER_PDF"] = "false"
$existing["MERIDIAN_ENABLE_SHARE_LINKS"] = "true"

$lines = @(
  "# Auto-merged by scripts/setup-cloud.ps1",
  "ANTHROPIC_API_KEY=$($existing['ANTHROPIC_API_KEY'])",
  "PERPLEXITY_API_KEY=$($existing['PERPLEXITY_API_KEY'])",
  "",
  "ANTHROPIC_MODEL=$($existing['ANTHROPIC_MODEL'])",
  "PERPLEXITY_RESEARCH_MODEL=$($existing['PERPLEXITY_RESEARCH_MODEL'])",
  "PERPLEXITY_SEARCH_MODEL=$($existing['PERPLEXITY_SEARCH_MODEL'])",
  "",
  "DATABASE_URL=$databaseUrl",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$clerkPk",
  "CLERK_SECRET_KEY=$clerkSk",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up",
  "MERIDIAN_ENABLE_SERVER_PDF=false",
  "MERIDIAN_ENABLE_SHARE_LINKS=true"
)

$lines | Set-Content -Encoding utf8 $envPath
Write-Host "Updated .env.local" -ForegroundColor Green

# 3. Push database schema
Write-Host "`nPushing database schema..." -ForegroundColor Cyan
$env:DATABASE_URL = $databaseUrl
npm run db:push
if ($LASTEXITCODE -ne 0) {
  Write-Host "db:push failed — check DATABASE_URL" -ForegroundColor Red
  exit 1
}
Write-Host "Database schema ready." -ForegroundColor Green

# 4. Vercel login + deploy
Write-Host "`nLogging into Vercel (browser may open)..." -ForegroundColor Cyan
npx vercel login
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nLinking project..." -ForegroundColor Cyan
npx vercel link --yes

$vars = @{
  "ANTHROPIC_API_KEY" = $existing["ANTHROPIC_API_KEY"]
  "PERPLEXITY_API_KEY" = $existing["PERPLEXITY_API_KEY"]
  "ANTHROPIC_MODEL" = $existing["ANTHROPIC_MODEL"]
  "PERPLEXITY_RESEARCH_MODEL" = $existing["PERPLEXITY_RESEARCH_MODEL"]
  "PERPLEXITY_SEARCH_MODEL" = $existing["PERPLEXITY_SEARCH_MODEL"]
  "DATABASE_URL" = $databaseUrl
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" = $clerkPk
  "CLERK_SECRET_KEY" = $clerkSk
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL" = "/sign-in"
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL" = "/sign-up"
  "MERIDIAN_ENABLE_SERVER_PDF" = "false"
  "MERIDIAN_ENABLE_SHARE_LINKS" = "true"
}

Write-Host "`nSetting Vercel environment variables (production)..." -ForegroundColor Cyan
foreach ($key in $vars.Keys) {
  if (-not $vars[$key]) { continue }
  $val = $vars[$key]
  echo $val | npx vercel env add $key production --force 2>$null
  echo $val | npx vercel env add $key preview --force 2>$null
  echo $val | npx vercel env add $key development --force 2>$null
  Write-Host "  set $key"
}

Write-Host "`nDeploying to production..." -ForegroundColor Cyan
npx vercel deploy --prod --yes
Write-Host "`nDone! Open the URL above. Sign in, then run a brief to test cloud sync." -ForegroundColor Green
