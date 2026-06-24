# Deploy only (env vars must already be on Vercel)
# .\scripts\deploy-vercel.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

npx vercel login
npx vercel link --yes
npx vercel deploy --prod --yes
