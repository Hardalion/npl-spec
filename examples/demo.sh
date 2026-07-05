#!/usr/bin/env bash
# Zero-clone smoke test for NPL v1.0.0 (run from npl-spec repo root after pnpm install && pnpm build)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/3 Policy eval: drop_table should BLOCK"
node packages/policy-engine/dist/cli.js --tool drop_table --json || test $? -eq 1

echo ""
echo "==> 2/3 Policy eval: query_positions should ALLOW"
node packages/policy-engine/dist/cli.js --tool query_positions --json

echo ""
echo "==> 3/3 Audit chain verify (offline)"
node packages/audit-verify/dist/cli.js examples/audit-export.sample.json --verbose

echo ""
echo "OK - NPL reference implementation smoke test passed."
