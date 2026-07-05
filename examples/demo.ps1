# Zero-clone smoke test for NPL v1.0.0 (run from npl-spec repo root after pnpm install && pnpm build)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> 1/3 Policy eval: drop_table should BLOCK"
node packages/policy-engine/dist/cli.js --tool drop_table --json
if ($LASTEXITCODE -ne 1) { throw "Expected exit code 1 for BLOCK" }

Write-Host ""
Write-Host "==> 2/3 Policy eval: query_positions should ALLOW"
node packages/policy-engine/dist/cli.js --tool query_positions --json
if ($LASTEXITCODE -ne 0) { throw "Expected exit code 0 for ALLOW" }

Write-Host ""
Write-Host "==> 3/3 Audit chain verify (offline)"
node packages/audit-verify/dist/cli.js examples/audit-export.sample.json --verbose
if ($LASTEXITCODE -ne 0) { throw "Audit verify failed" }

Write-Host ""
Write-Host "OK - NPL reference implementation smoke test passed."
