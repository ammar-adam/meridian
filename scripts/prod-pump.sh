#!/usr/bin/env bash
# Pump prod corpus + index checks via routes that exist on current deploy.
# Usage: ./scripts/prod-pump.sh [BASE_URL] [RUNS]

set -euo pipefail

BASE="${1:-https://meridian-stg.vercel.app}"
RUNS="${2:-3}"

echo "Prod pump — $BASE ($RUNS runs via /api/pilot + /api/benchmark)"

for i in $(seq 1 "$RUNS"); do
  echo ""
  echo "=== Run $i/$RUNS ==="
  curl -sS -m 280 "$BASE/api/pilot" -o /tmp/m-pilot.json
  python3 -c "
import json
d = json.load(open('/tmp/m-pilot.json'))
m = d.get('metrics') or {}
ic = d.get('indexCheck') or {}
bf = d.get('bulkFill') or {}
print(f\"pilot verifiedMiss={m.get('verifiedMiss')} entitiesChecked={m.get('entitiesChecked')}\")
print(f\"indexCheck ran={ic.get('ran')} checked={ic.get('checked')} misses={ic.get('misses')}\")
print(f\"bulkFill ran={bf.get('ran')} after={bf.get('after')} delta={bf.get('delta')}\")
"
  curl -sS -m 120 "$BASE/api/benchmark" -o /tmp/m-bench.json
  python3 -c "
import json
d = json.load(open('/tmp/m-bench.json'))
s = d.get('stats') or {}
fp = d.get('feedParity') or {}
print(f\"benchmark records={s.get('companyRecords')} checked={s.get('entitiesChecked')} misses={s.get('verifiedMisses')}\")
print(f\"feedParity={'yes' if fp.get('feedStats') else 'no'} bulkFillKey={'bulkFill' in d}\")
"
  sleep 3
done

echo ""
echo "Done. Run: npm run debate"
