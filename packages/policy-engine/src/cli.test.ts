import { describe, expect, it } from 'vitest'
import { parsePolicyEvalArgs, runPolicyEval } from './cli.js'

describe('nexus-policy-eval CLI', () => {
  it('parses minimal args', () => {
    expect(parsePolicyEvalArgs(['--tool', 'drop_table'])).toEqual({
      toolName: 'drop_table',
      toolArgs: undefined,
      agentRole: undefined,
      policy: undefined,
      policyFile: undefined,
      policyUri: undefined,
      json: false,
    })
  })

  it('blocks destructive tools via bundled policy', async () => {
    const decision = await runPolicyEval({ toolName: 'drop_table' })
    expect(decision.action).toBe('BLOCK')
    expect(decision.ruleId).toBe('nexus_pol_block_destructive')
  })

  it('resolves local hardalion:// URI', async () => {
    const decision = await runPolicyEval({
      toolName: 'drop_table',
      policyUri: 'hardalion://nato-prou-strict-financial@1.0.0',
    })
    expect(decision.action).toBe('BLOCK')
  })
})
