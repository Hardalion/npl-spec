# NPL: AI Agent Governance Specification

**Open specification for deterministic AI agent governance.**

Originated by [Hardalion](https://hardalion.com). Apache 2.0.

Write portable policies once. Run them anywhere. Verify every decision.

---

## What is NPL?

NPL (Nexus Policy Language) is an open standard for **deterministic policy enforcement** across autonomous AI agents: before a tool runs, before an action commits, before a human is bypassed.

Policies declare rules. A conforming evaluator returns `ALLOW`, `BLOCK`, or `REQUIRE_HUMAN` with a stable `ruleId` and severity. The same input always yields the same output.

Policies may be authored as YAML or JSON. The normative contract is the [schema](./spec/policy-schema.md) and [determinism guarantee](./spec/deterministic-evaluation.md).

```yaml
version: "1.0.0"
policyName: institutional-financial-controls
targetAgents: ["*"]
rules:
  - ruleId: block_destructive_tools
    action: BLOCK
    condition: "tool.name in ['drop_table', 'delete_user']"
    alertSeverity: CRITICAL
  - ruleId: require_human_large_transfer
    action: REQUIRE_HUMAN
    condition: "tool.name == 'wire_transfer' && args.amount > 10000"
    alertSeverity: MEDIUM
```

```bash
npx @hardalion/npl-policy-engine --tool drop_table --json
# → action: BLOCK
```

---

## NPL and Nexus

| Layer | What it is | Where |
| --- | --- | --- |
| **NPL** (this repo) | Open policy language, reference CLI, audit verifier | Apache 2.0, npm |
| **Nexus** (platform) | Hosted MCP Gateway, AgentIAM, immutable audit, compliance exports | [docs.hardalion.com](https://docs.hardalion.com) |

NPL is the portable policy contract. [Hardalion Nexus](https://hardalion.com) is the commercial execution spine that compiles and enforces NPL at production scale: zero LLM tokens on the policy path, p99 gate latency under 201 ms, EU AI Act and DORA readiness.

You do not need Nexus to evaluate policies locally or in CI.

---

## Why does NPL exist?

Agent frameworks execute tools. Regulations and risk teams need **provable, repeatable gates** on those tools. Prompt instructions are not enforceable under audit.

NPL separates **what is allowed** (portable standard) from **who enforces it at scale** (your runtime or a hosted platform).

Unlike prompt-based guardrails that route safety through a secondary LLM, NPL evaluates tool payloads against compiled rules **in-memory with zero token cost**.

---

## Why not OPA / Rego?

[OPA](https://www.openpolicyagent.org/) is general-purpose policy infrastructure. NPL is purpose-built for **agent tool-call governance**.

| | OPA / Rego | NPL |
|---|---|---|
| Primary input | Arbitrary JSON document | `tool.name`, `tool.args`, agent role |
| Primary output | `allow` / `deny` | `ALLOW` / `BLOCK` / `REQUIRE_HUMAN` + `alertSeverity` |
| Agent semantics | Bring your own schema | `targetAgents`, scoped evaluation |
| Audit portability | External | [Hash-chain verify format](./packages/audit-verify/README.md) |
| Versioned federation | Bundle files | `hardalion://policy-id@1.0.0` immutable pins |

Use OPA for infrastructure authorization. Use NPL when the decision unit is **an agent about to act**.

Full comparison: [spec/why-not-opa.md](./spec/why-not-opa.md).

---

## Quick start

### No clone (fastest)

```bash
npx @hardalion/npl-policy-engine --tool drop_table --json
npx @hardalion/npl-audit-verify ./examples/audit-export.sample.json
```

### Clone (contributors)

```bash
git clone https://github.com/hardalion/npl-spec.git
cd npl-spec
pnpm install && pnpm test && pnpm build && pnpm demo
```

### Programmatic

```typescript
import { evaluateToolCall } from '@hardalion/npl-policy-engine'

const decision = evaluateToolCall({
  policy: 'nato-prou-strict-financial',
  toolName: 'drop_table',
  toolArgs: { table: 'users' },
})

console.log(decision.action) // BLOCK
console.log(decision.ruleId)
```

### Pin a federated policy

```bash
npx @hardalion/npl-policy-engine \
  --policy-uri hardalion://nato-prou-strict-financial@1.0.0 \
  --tool drop_table --json
```

### Integrate (LangChain, CrewAI, OpenAI Agents)

See [integrations/README.md](./integrations/README.md): one hook before tool invocation.

For hosted enforcement with AgentIAM and MCP Gateway inspection, see [Hardalion Docs](https://docs.hardalion.com/docs/quickstart).

---

## What ships in this repository (Apache 2.0)

| Artifact | npm | Role |
| --- | --- | --- |
| [spec/](./spec/) | | Normative specification (determinism, URIs, identity) |
| Reference evaluator | `@hardalion/npl-policy-engine` | CLI `npl-eval`, programmatic API |
| Audit verifier | `@hardalion/npl-audit-verify` | Offline hash-chain verification |
| [examples/](./examples/) | | Reference policies + audit sample |
| [integrations/](./integrations/) | | Framework integration patterns |

---

## Reference policies

| Policy ID | Use case |
| --- | --- |
| `nato-prou-strict-financial` | Financial agent controls: blocks destructive tools, flags high-value transfers |
| `eu-ai-act-art5-prohibited` | Thin EU AI Act Art. 5 prohibited-practices gate (example) |

Federated URI:

```
hardalion://nato-prou-strict-financial@1.0.0
```

Spec: [spec/hardalion-uri-scheme.md](./spec/hardalion-uri-scheme.md). Agent identity: [spec/nagi-namespace.md](./spec/nagi-namespace.md).

---

## What NPL is not

This repository does **not** include:

- Distributed policy enforcement or kill switches
- Immutable audit **storage** or compliance dashboards
- DORA / MiFID / EU AI Act workflow engines
- Multi-tenant SaaS, SSO, or hosted governance consoles

Those capabilities are provided by [Hardalion Nexus](https://hardalion.com). **You do not need to buy anything to evaluate NPL policies.**

---

## Federated policies

Publish version-pinned policies as URIs:

```
hardalion://nato-prou-strict-financial@1.0.0
```

Evaluators resolve from a local catalog offline. Remote registry fetch is optional and **fail-closed**.

---

## Documentation

| Resource | URL |
| --- | --- |
| Nexus platform docs | [docs.hardalion.com](https://docs.hardalion.com) |
| NPL Quickstart | [docs.hardalion.com/docs/npl-quickstart](https://docs.hardalion.com/docs/npl-quickstart) |
| MCP Gateway | [docs.hardalion.com/docs/mcp-gateway](https://docs.hardalion.com/docs/mcp-gateway) |
| Reference policies | [docs.hardalion.com/docs/npl/policies](https://docs.hardalion.com/docs/npl/policies) |
| API | [api.hardalion.com](https://api.hardalion.com) |

---

## Roadmap

| Phase | Deliverable |
| --- | --- |
| **1 (now)** | `npl-spec`: specification + reference evaluator |
| **2** | VS Code extension, playground, expanded `policy-examples` |
| **3** | Python and Go SDKs |
| **4** | Official framework plugins (LangChain, Semantic Kernel, …) |

---

## License

Apache License 2.0. See [LICENSE](./LICENSE).

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md)

## Citation

```
NPL v1.0: Open Specification for AI Agent Governance.
Originated by Hardalion, 2026. https://github.com/hardalion/npl-spec
```
