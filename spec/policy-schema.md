# NPL policy document schema

**Status:** Normative (NPL v1.0)  
**Media type:** `application/x-npl-policy+json` or YAML equivalent

Policies are JSON objects (YAML is a serialization). Conforming documents MUST validate against this schema.

## Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | yes | Policy document semver (`major.minor.patch`) |
| `policyName` | string | yes | Stable id, **kebab-case** (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) |
| `description` | string | no | Human-readable summary |
| `targetAgents` | string[] | yes | Agent roles governed, or `["*"]` for all |
| `rules` | Rule[] | yes | Non-empty ordered rule list |

## Rule object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ruleId` | string | yes | Stable identifier for audit and logs |
| `action` | enum | yes | `ALLOW` \| `BLOCK` \| `REQUIRE_HUMAN` \| `SIMULATE` |
| `condition` | string | yes | Safe expression (see [deterministic-evaluation.md](./deterministic-evaluation.md)) |
| `alertSeverity` | enum | yes | `LOW` \| `MEDIUM` \| `CRITICAL` |

## Evaluation semantics

1. If `agentRole` is provided and not in `targetAgents` (and `targetAgents` does not include `*`): return `ALLOW` with `ruleId: npl_agent_not_in_scope` without evaluating rules.
2. Evaluate `rules` in **document order**. First matching condition wins.
3. If no rule matches: return `ALLOW` with `ruleId: npl_default_allow`.

## Decision output

Conforming evaluators return:

```typescript
interface PolicyDecision {
  matched: boolean
  action: 'ALLOW' | 'BLOCK' | 'REQUIRE_HUMAN' | 'SIMULATE'
  ruleId: string
  reason: string
  alertSeverity: 'LOW' | 'MEDIUM' | 'CRITICAL'
  policyName?: string
}
```

## Example

```yaml
version: "1.0.0"
policyName: institutional-financial-controls
description: Reference financial agent controls
targetAgents: ["*"]
rules:
  - ruleId: block_destructive_tools
    action: BLOCK
    condition: "tool.name in ['drop_table', 'delete_user']"
    alertSeverity: CRITICAL
```

## Reference implementation

The Zod schema in `@hardalion/npl-policy-engine` (`NplPolicySchema` / legacy export `NexusPolicySchema`) is the conformance test harness for v1.0.

## Versioning

Breaking schema changes require a new major NPL version. Registry URIs MUST pin semver: `hardalion://policy-name@1.0.0` (see [hardalion-uri-scheme.md](./hardalion-uri-scheme.md)).
