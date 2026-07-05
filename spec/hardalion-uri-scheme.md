# hardalion://: Policy Federation URI Scheme

**Status:** Draft standard (NPL v1.0, originated by Hardalion)  
**Version:** 1.0  
**Date:** 2026-06-27

## Abstract

Cross-organization policy federation requires immutable, version-pinned policy references. The `hardalion://` URI scheme identifies a specific NPL document published to the Hardalion Policy Registry.

## Syntax

```
hardalion://{policy-id}@{semver}[/publisher/{publisher-id}]
```

### Required components

| Component | Rule |
|-----------|------|
| `policy-id` | kebab-case (`nato-prou-strict-financial`) |
| `semver` | `major.minor.patch` (e.g. `1.0.0`), **required** |

Unpinned URIs are **invalid**:

```
hardalion://nato-prou-strict-financial        ❌
hardalion://nato-prou-strict-financial@1.0.0  ✅
```

## Immutability

A published `{policy-id}@{version}` entry never mutates. Policy updates publish as a new version key (`@1.1.0`). Running agents pinned to `@1.0.0` cannot silently inherit `@1.1.0` rules.

## Fail-closed resolution

If registry resolution fails (network, 404, schema error, version mismatch):

1. Enforcement action: **BLOCK**
2. Rule id: `NPL_REGISTRY_FAIL_CLOSED`
3. Audit record written before throw

No permissive fallback.

## Federated trust model

1. **Publisher** (Org A) publishes policy + `contentHash` to registry
2. **Importer** (Org B) references `hardalion://...` in SDK / gateway config
3. Importer fetches immutable document; enforcement uses exact pinned version

## Content addressing

Registry entries include:

```json
{
  "policyId": "nato-prou-strict-financial",
  "version": "1.0.0",
  "publisher": "hardalion",
  "immutable": true,
  "contentHash": "sha256...",
  "policy": { }
}
```

`contentHash` = SHA-256 of canonical JSON policy document.

## Reference implementation

- `@hardalion/npl-policy-engine`: `parseHardalionPolicyUri()`, `PolicyRegistryClient`
- Optional registry HTTP API: `GET /v1/infrastructure/policies/{policy-id}@{version}`
