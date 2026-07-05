# nagi:, Cross-Platform Agent Identity

**Status:** Draft standard (NPL v1.0, originated by Hardalion)  
**Version:** 1.0  
**Date:** 2026-06-27

## Abstract

Autonomous agents run across multiple frameworks (LangChain, CrewAI, OpenAI Assistants, MCP-native). Without a canonical identity, kill switch, audit, and policy enforcement fragment per framework. The `nagi:` namespace provides a stable, tenant-scoped agent identifier.

## Format

```
nagi:{tenant_id}:{logical_agent_id}
```

- `tenant_id`, tenant boundary (institution / pilot org)
- `logical_agent_id`, kebab-case stable name chosen by operator (max 128 chars normalized)

## Example

```
nagi:tenant-demokritos:validation-lab-agent
```

Same id whether the runtime is LangChain or OpenAI Assistants.

## Normalization

Logical agent ids are normalized to lowercase kebab-case:

| Input | Normalized |
|-------|------------|
| `Validation Lab Agent` | `validation-lab-agent` |
| `pre-trade-agent` | `pre-trade-agent` |

## Binding key

Framework-specific tracing uses a short SHA-256 binding key:

```
SHA256("{tenant_id}|{logical_agent_id}|{framework}").slice(0, 32)
```

The `nagiId` remains stable; `bindingKey` differs per framework adapter.

## Reference implementation

`@hardalion/npl-policy-engine` adapters map framework handles to `nagi:{tenant}:{agent}`.

## Security considerations

- `nagi:` ids are not authentication credentials
- Pair with workload identity for cryptographic verification at execution time
- Kill switch and audit should reference `nagiId`, not framework-native handles
