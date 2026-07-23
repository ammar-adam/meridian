#!/usr/bin/env bash
# Meridian demo preflight — run before recording.
# Usage: ./scripts/demo-preflight.sh [BASE_URL]

set -euo pipefail

BASE="${1:-https://meridian-eight-sandy.vercel.app}"
RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
NC='\033[0m'

ok() { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn() { printf "${AMBER}!${NC} %s\n" "$1"; }
fail() { printf "${RED}✗${NC} %s\n" "$1"; }

echo "Meridian demo preflight — ${BASE}"
echo ""

# Health
if ! HEALTH=$(curl -sf "${BASE}/api/health"); then
  fail "Could not reach ${BASE}/api/health"
  exit 1
fi

AI=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('features',{}).get('aiGeneration',False))")
DB=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('features',{}).get('persistence',False))")
RES=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('features',{}).get('deepResearch',False))")
IDX=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('features',{}).get('indexChecks',False))")
PDF=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('features',{}).get('serverPdf',False))")

if [[ "$AI" == "True" && "$DB" == "True" && "$RES" == "True" ]]; then
  ok "Core stack (Claude + DB + Perplexity)"
else
  fail "Core stack incomplete (ai=$AI db=$DB research=$RES)"
fi

[[ "$IDX" == "True" ]] && ok "StartupHub index checks" || warn "STARTUPHUB_API_KEY missing"
[[ "$PDF" == "True" ]] && ok "Server PDF (proof export)" || warn "Proof PDF may be limited"

# Benchmark
BENCH_CODE=$(curl -sS -o /tmp/m-bench.json -w "%{http_code}" "${BASE}/api/benchmark")
if [[ "$BENCH_CODE" == "200" ]]; then
  RECORDS=$(python3 -c "import json; d=json.load(open('/tmp/m-bench.json')); print(d.get('companyRecords') or d.get('stats',{}).get('entities') or '—')" 2>/dev/null || echo "—")
  FEED=$(python3 -c "import json; d=json.load(open('/tmp/m-bench.json')); print('yes' if d.get('feedParity') else 'no')" 2>/dev/null || echo "no")
  ok "Benchmark HTTP 200 — records: ${RECORDS}, feedParity: ${FEED}"
  if [[ "$FEED" == "no" ]]; then
    warn "Prod deploy may lag main — redeploy before demo"
  fi
else
  warn "Benchmark HTTP ${BENCH_CODE}"
fi

# Corpus
CORPUS_CODE=$(curl -sS -o /tmp/m-corpus.json -w "%{http_code}" "${BASE}/api/corpus")
if [[ "$CORPUS_CODE" == "200" ]]; then
  CR=$(python3 -c "import json; d=json.load(open('/tmp/m-corpus.json')); print(d.get('companyRecords','—'))" 2>/dev/null || echo "—")
  ok "/api/corpus live — ${CR} company records"
  if [[ "$CR" != "—" && "$CR" -lt 150 ]] 2>/dev/null; then
    warn "Corpus below 150 — run: curl -sS '${BASE}/api/corpus?force=1' | jq ."
  fi
else
  warn "/api/corpus HTTP ${CORPUS_CODE} — redeploy from latest main"
fi

# Deploy freshness (needs benchmark + corpus above)
BF=$(python3 -c "import json; d=json.load(open('/tmp/m-bench.json')); print('yes' if 'bulkFill' in d else 'no')" 2>/dev/null || echo "no")
if [[ "$CORPUS_CODE" != "200" || "$FEED" == "no" || "$BF" == "no" ]]; then
  warn "Deploy STALE — Vercel → Deployments → Redeploy from main (see docs/DEMO-HANDOFF.md §0)"
fi

echo ""
echo "Next: open ${BASE}/demo → Activate Panache → Warm corpus → Deal Flow → record"
echo "Script: docs/investor-demo-film.md · Handoff: docs/DEMO-HANDOFF.md"
