# Framework integrations

NPL integrates at **one hook**: immediately before an agent invokes a tool (or external action).

Conforming pattern:

1. Build evaluation input: `toolName`, `toolArgs`, optional `agentRole`
2. Call `evaluateToolCall()` (or `npl-eval` CLI in CI)
3. On `BLOCK`: abort, log `ruleId`
4. On `REQUIRE_HUMAN`: queue for approval, do not execute
5. On `ALLOW`: proceed

No framework-specific SDK is required for v1.0. Wrap the reference evaluator.

---

## TypeScript / LangChain-style middleware

```typescript
import { evaluateToolCall } from '@hardalion/npl-policy-engine'

export class NplToolGate {
  constructor(private readonly policy: string) {}

  async beforeToolCall(toolName: string, toolArgs: Record<string, unknown>) {
    const decision = evaluateToolCall({
      policy: this.policy,
      toolName,
      toolArgs,
    })

    if (decision.action === 'BLOCK') {
      throw new Error(`NPL BLOCK [${decision.ruleId}]: ${decision.reason}`)
    }
    if (decision.action === 'REQUIRE_HUMAN') {
      return { deferred: true, ruleId: decision.ruleId, reason: decision.reason }
    }
    return { proceed: true }
  }
}
```

Wire into your agent executor where tools are dispatched.

---

## Hardalion Nexus (hosted enforcement)

For production deployments with AgentIAM, MCP Gateway inspection, shadow mode, and hash-chained audit, use the **hosted platform** rather than wiring this repo directly.

This open repository does not ship a proprietary TypeScript SDK. Integrate with Nexus through documented HTTP APIs and platform guides:

- [Quickstart](https://docs.hardalion.com/docs/quickstart)
- [MCP Gateway](https://docs.hardalion.com/docs/mcp-gateway)
- [API reference](https://api.hardalion.com)

Typical setup: create a workspace, issue an API key, pin a policy URI (for example `hardalion://nato-prou-strict-financial@1.0.0`), and route agent tool calls through the gateway so decisions are enforced and audit entries are hash-chained.

Client libraries may be published separately later; until then, treat the API docs as the source of truth.

---

## Python (conceptual, SDK Phase 3)

```python
# Future: pip install hardalion-npl
decision = npl.evaluate_tool_call(
    policy="institutional-financial-controls",
    tool_name="drop_table",
    tool_args={"table": "users"},
)
if decision.action == "BLOCK":
    raise PolicyBlocked(decision.rule_id, decision.reason)
```

Until the Python package ships, call `npl-eval --json` as a subprocess from CI or thin wrappers.

---

## OpenAI Agents / function-calling

Map each function call to NPL before execution:

```typescript
const decision = evaluateToolCall({
  policy: process.env.NPL_POLICY!,
  toolName: functionCall.name,
  toolArgs: JSON.parse(functionCall.arguments),
})
```

---

## CI gate (any language)

```bash
npl-eval --policy-file policies/pre-deploy.yaml --tool deploy_prod --json
# Exit 1 = BLOCK (fail the pipeline)
```

Pin immutable policies in CI:

```bash
npl-eval --policy-uri hardalion://nato-prou-strict-financial@1.0.0 --tool drop_table --json
```

---

## Enterprise enforcement

Self-hosted evaluation (this repo) is sufficient for adoption, research, and CI gates.

Institutions needing distributed enforcement, immutable audit storage, kill switches, shadow mode, and regulatory exports should evaluate [Hardalion Nexus](https://hardalion.com): the hosted platform that implements NPL at production scale.

Platform documentation: [docs.hardalion.com](https://docs.hardalion.com)

---

## Contributing an official adapter

Phase 4 welcomes contributed plugins. Open a PR with:

- Minimal wrapper (under 100 lines)
- Test with a known BLOCK and ALLOW fixture
- No dependency on proprietary Nexus packages (use `@hardalion/npl-policy-engine` only)
