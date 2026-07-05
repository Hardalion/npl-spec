import { describe, expect, it } from 'vitest'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  evaluateInvocation,
  loadPolicyFromFile,
  resetBundledPoliciesForTests,
  resolvePolicy,
} from './engine.js'
import { evaluateCondition, inferToolFromPayload, buildEvaluationContext } from './evaluator.js'
import { CANONICAL_NATO_PROU_STRICT_FINANCIAL, NexusPolicySchema } from './schema.js'

describe('NPL edge cases', () => {
  it('rejects unknown policy name', () => {
    expect(() => resolvePolicy('does_not_exist')).toThrow(/Unknown NPL policy/)
  })

  it('loads policy from filesystem path', () => {
    const path = join(tmpdir(), `npl-${Date.now()}.yaml`)
    writeFileSync(
      path,
      `version: "1.0"
policyName: file-policy
targetAgents: ["*"]
rules:
  - ruleId: allow_all
    action: ALLOW
    condition: "tool.name == 'ping'"
    alertSeverity: LOW
`
    )
    try {
      const policy = loadPolicyFromFile(path)
      expect(policy.policyName).toBe('file-policy')
    } finally {
      unlinkSync(path)
    }
  })

  it('evaluates invocation with structured tool call object', () => {
    const decision = evaluateInvocation({
      policy: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
      args: [{ name: 'wire_transfer', args: { amount: 25_000 } }],
    })
    expect(decision.action).toBe('REQUIRE_HUMAN')
  })

  it('resets bundled policy cache', () => {
    resetBundledPoliciesForTests()
    expect(resolvePolicy(CANONICAL_NATO_PROU_STRICT_FINANCIAL).policyName).toBe(
      CANONICAL_NATO_PROU_STRICT_FINANCIAL
    )
  })

  it('returns false for empty condition', () => {
    expect(evaluateCondition('   ', { tool: { name: 'x' } })).toBe(false)
  })

  it('supports inequality and ordering operators', () => {
    expect(evaluateCondition("args.count != 0", { args: { count: 1 } })).toBe(true)
    expect(evaluateCondition('args.count < 5', { args: { count: 3 } })).toBe(true)
    expect(evaluateCondition('args.count >= 10', { args: { count: 10 } })).toBe(true)
  })

  it('infers wire transfer and drop table payloads', () => {
    expect(inferToolFromPayload('Please wire transfer funds')).toBe('wire_transfer')
    expect(inferToolFromPayload('drop the table now')).toBe('drop_table')
    expect(inferToolFromPayload('hello world')).toBeUndefined()
  })

  it('builds context with explicit tool name', () => {
    const ctx = buildEvaluationContext({ toolName: 'query', toolArgs: { limit: 1 } })
    expect(ctx.tool?.name).toBe('query')
    expect(ctx.args?.limit).toBe(1)
  })

  it('validates schema rejects empty rules', () => {
    expect(() =>
      NexusPolicySchema.parse({
        version: '1.0',
        policyName: 'bad',
        targetAgents: ['*'],
        rules: [],
      })
    ).toThrow()
  })
})
