import { describe, expect, it } from 'vitest'
import {
  evaluatePolicy,
  evaluateToolCall,
  listBundledPolicyNames,
  parsePolicyDocument,
  resolvePolicy,
} from './engine.js'
import { evaluateCondition } from './evaluator.js'
import { CANONICAL_NATO_PROU_STRICT_FINANCIAL } from './schema.js'

describe('NPL policy engine coverage', () => {
  it('lists bundled policies', () => {
    expect(listBundledPolicyNames()).toContain(CANONICAL_NATO_PROU_STRICT_FINANCIAL)
  })

  it('resolves inline JSON policy', () => {
    const policy = resolvePolicy(
      JSON.stringify({
        version: '1.0',
        policyName: 'inline-test',
        targetAgents: ['*'],
        rules: [
          {
            ruleId: 'r1',
            action: 'SIMULATE',
            condition: "tool.name == 'probe'",
            alertSeverity: 'LOW',
          },
        ],
      })
    )
    expect(policy.policyName).toBe('inline-test')
  })

  it('returns SIMULATE for matched simulate rule', () => {
    const decision = evaluateToolCall({
      policy: parsePolicyDocument(`
version: "1.0"
policyName: simulate-only
targetAgents: ["*"]
rules:
  - ruleId: sim_probe
    action: SIMULATE
    condition: "tool.name == 'probe'"
    alertSeverity: LOW
`),
      toolName: 'probe',
    })
    expect(decision.action).toBe('SIMULATE')
    expect(decision.matched).toBe(true)
  })

  it('scopes policy to target agent roles', () => {
    const decision = evaluatePolicy({
      policy: parsePolicyDocument(`
version: "1.0"
policyName: role-scoped
targetAgents: ["risk_manager"]
rules:
  - ruleId: block_all
    action: BLOCK
    condition: "tool.name == 'any'"
    alertSeverity: CRITICAL
`),
      agentRole: 'trader',
      context: { tool: { name: 'any' } },
    })
    expect(decision.ruleId).toBe('nexus_pol_agent_not_in_scope')
    expect(decision.action).toBe('ALLOW')
  })

  it('evaluates compound conditions with &&', () => {
    expect(
      evaluateCondition("tool.name == 'wire_transfer' && args.amount > 10000", {
        tool: { name: 'wire_transfer' },
        args: { amount: 20_000 },
      })
    ).toBe(true)
    expect(
      evaluateCondition("tool.name == 'wire_transfer' && args.amount > 10000", {
        tool: { name: 'wire_transfer' },
        args: { amount: 100 },
      })
    ).toBe(false)
  })

  it('evaluates in-list membership', () => {
    expect(
      evaluateCondition("tool.name in ['drop_table', 'delete_user']", {
        tool: { name: 'delete_user' },
      })
    ).toBe(true)
  })
})
