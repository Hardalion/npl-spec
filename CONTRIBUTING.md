# Contributing to NPL

## Scope

This open-source repository contains **only** the NPL standard and reference implementation:

- Schema (`NexusPolicySchema`)
- Parser (YAML/JSON)
- Safe condition evaluator
- Registry URI specification (documentation)

## Pull request requirements

1. **Canonical naming**: policy ids must be kebab-case (`my-policy-name`)
2. **Tests**, every rule or grammar change needs compliant + breach fixtures
3. **No eval()**, conditions must use the safe evaluator grammar
4. **Version pins**: registry URIs must include `@semver`
5. **Fail-closed**: registry client changes must not add permissive fallbacks

## Development

From the repository root:

```bash
pnpm install
pnpm test
pnpm build
pnpm demo
```

For package-only work:

```bash
cd packages/policy-engine
pnpm test
```

## Governance

NPL schema changes are reviewed for backward compatibility. Breaking changes require a new major NPL version and new registry keys (never silent mutation).
