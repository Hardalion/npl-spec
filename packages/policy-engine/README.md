# @hardalion/npl-policy-engine

Reference implementation of the [NPL](https://github.com/hardalion/npl-spec) evaluator.

Apache 2.0. Originated by [Hardalion](https://hardalion.com).

## CLI

```bash
npx @hardalion/npl-policy-engine --help
npl-eval --tool drop_table --json
npl-eval --policy-file ./policy.yaml --tool wire_transfer --args '{"amount":50000}'
npl-eval --policy-uri hardalion://nato-prou-strict-financial@1.0.0 --tool drop_table --json
```

Exit code `1` = `BLOCK`. Exit code `0` = allowed or requires human review.

## Programmatic

```typescript
import { evaluateToolCall } from '@hardalion/npl-policy-engine'

const decision = evaluateToolCall({
  policy: 'nato-prou-strict-financial',
  toolName: 'drop_table',
  toolArgs: { table: 'users' },
})
```

## Bundled reference policies

- `nato-prou-strict-financial`
- `eu-ai-act-art5-prohibited` (thin Art. 5 gate example)

Federated URI (offline catalog): `hardalion://nato-prou-strict-financial@1.0.0`

## Hosted enforcement

For MCP Gateway, AgentIAM, and audit at scale, see [Hardalion Docs](https://docs.hardalion.com/docs/npl-quickstart).

Specification: [github.com/hardalion/npl-spec](https://github.com/hardalion/npl-spec)
