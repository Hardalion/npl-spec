# @hardalion/npl-audit-verify

Offline verifier for NPL-compatible audit hash chains. No server required.

Apache 2.0. Originated by [Hardalion](https://hardalion.com).

## CLI

```bash
npx @hardalion/npl-audit-verify ./audit-export.json
npl-audit-verify ./audit-export.json --verbose
```

Exit code `0` = chain valid. Non-zero = tamper detected or malformed export.

## Programmatic

```typescript
import { verifyAuditChain } from '@hardalion/npl-audit-verify'
```

## Platform audit exports

Hardalion Nexus generates hash-chained audit logs exportable for EU AI Act and DORA evidence packs. See [docs.hardalion.com/docs/audit-trail](https://docs.hardalion.com/docs/audit-trail).

Specification: [github.com/hardalion/npl-spec](https://github.com/hardalion/npl-spec)
