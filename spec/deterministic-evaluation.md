# Deterministic policy evaluation (NPL)

Normative property for regulated environments: **same input → same output, always, with no side effects.**

## Guarantee

A conforming NPL evaluator:

1. Does **not** call `eval()`, `Function()`, or dynamic code execution
2. Does **not** perform network I/O, filesystem access, or clock reads during evaluation
3. Does **not** mutate input context or global state
4. Parses conditions into a fixed AST evaluated with pure functions
5. Returns a `PolicyDecision` object fully determined by `(policy document, agentRole, evaluation context)`

## Formal inputs

```
evaluatePolicy({
  policy: NplPolicy | policyId | YAML path,
  agentRole?: string,
  context: { tool?: { name }, args?: Record<string, unknown>, ... }
}) → PolicyDecision
```

`PolicyDecision` fields: `action`, `ruleId`, `matched`, `alertSeverity`, `policyName`, `reason`.

## Determinism test contract

Any third party can verify:

```typescript
const input = {
  policy: 'nato-prou-strict-financial',
  toolName: 'wire_transfer',
  toolArgs: { amount: 25_000 },
}

const a = evaluateToolCall(input)
const b = evaluateToolCall(input)
assert.deepEqual(a, b) // always true
```

Reference tests: `packages/policy-engine/src/engine.test.ts`.

## Non-determinism boundaries (explicit)

| Component | Deterministic? | Notes |
|-----------|----------------|-------|
| NPL condition evaluator | **Yes** | Pure |
| Bundled policy resolution | **Yes** | Static catalog |
| `hardalion://` registry fetch | **No** | Network; fail-closed BLOCK if unreachable |
| Legacy alias normalization | **Yes** | `NATO_PRoU_Strict_Financial` → `nato-prou-strict-financial` |

For air-gap / regulated deployments: pin `policy` to bundled id or local YAML file, no registry fetch.

## Rule precedence

Rules evaluate in document order. First matching rule wins. If no rule matches: `ALLOW` with `ruleId: npl_default_allow`.

Agent scope: if `agentRole` not in `targetAgents` (and not `*`): `ALLOW` with `ruleId: npl_agent_not_in_scope` (no rule evaluation).

## Version pinning

Policy documents carry `version` and `policyName` (kebab-case). Registry URIs require immutable pin: `hardalion://policy-id@1.0.0`.
