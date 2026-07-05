# Why NPL instead of OPA / Rego?

**Status:** Informative (not normative). NPL v1.0.

OPA is excellent general-purpose policy infrastructure. NPL addresses a narrower, growing problem: **governing autonomous agents that call tools**.

## Problem framing

| Layer | Question |
|-------|----------|
| OPA | "Is this request allowed given this JSON document?" |
| NPL | "May this agent invoke this tool with these arguments right now?" |

Agent runtimes already have a natural decision point: `onToolCall(tool, args)`. NPL standardizes that hook.

## Comparison

### Input model

**OPA:** You define `input` shape per deployment. Flexible, but every integrator reinvents agent semantics.

**NPL:** Normative evaluation context includes `tool.name`, `tool.args`, optional `agentRole`, and policy `targetAgents`. Framework adapters map native handles to this shape once.

### Output model

**OPA:** Boolean allow/deny (plus optional metadata).

**NPL:** `ALLOW` | `BLOCK` | `REQUIRE_HUMAN` with `ruleId`, `reason`, and `alertSeverity`. Aligned with human-in-the-loop agent operations and audit exports.

### Determinism

Both can be deterministic. NPL **requires** deterministic evaluation for conforming implementations (see [deterministic-evaluation.md](./deterministic-evaluation.md)): no network, no clock, no randomness in the evaluator core.

### Audit

**OPA:** Audit is typically external.

**NPL:** Defines an offline-verifiable hash-chain export format (`@hardalion/npl-audit-verify`). Evaluator decisions can be chained into tamper-evident logs without trusting a vendor server.

### Federation

**OPA:** Policy bundles distributed as files or OPA Bundle API.

**NPL:** `hardalion://policy-id@semver` immutable version pins (see [hardalion-uri-scheme.md](./hardalion-uri-scheme.md)). Evaluators fail closed when a pinned policy cannot be resolved.

## When to use both

Many enterprises will run **OPA for API authorization** and **NPL for agent tool governance**. They are complementary, not competing replacements.

## When NPL alone is enough

- Agent middleware (LangChain, CrewAI, OpenAI Agents SDK, Claude Code hooks)
- Pre-trade or pre-action compliance gates on tool invocation
- Research prototypes needing portable, citable governance rules
- Offline policy evaluation in CI (`npl-eval` exit codes)

## Origins

NPL is originated by Hardalion. Adoption does not require Hardalion software. Forks and third-party evaluators are explicitly permitted under Apache 2.0.
