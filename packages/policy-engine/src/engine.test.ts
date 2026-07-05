import { describe, expect, it } from 'vitest'
import {
  evaluateToolCall,
  evaluateInvocation,
  parsePolicyDocument,
  resolvePolicy,
} from './engine.js'
import { CANONICAL_NATO_PROU_STRICT_FINANCIAL } from './schema.js'
import { evaluateCondition } from './evaluator.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('NPL schema and evaluator', () => {
  const yaml = readFileSync(
    join(__dirname, 'policies', 'nato-prou-strict-financial.yaml'),
    'utf8'
  )

  it('parses example NATO PRoU YAML policy', () => {
    const policy = parsePolicyDocument(yaml)
    expect(policy.policyName).toBe('nato-prou-strict-financial')
    expect(policy.rules).toHaveLength(2)
  })

  it('blocks destructive tool names', () => {
    const decision = evaluateToolCall({
      policy: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
      toolName: 'drop_table',
      toolArgs: { table: 'users' },
    })
    expect(decision.action).toBe('BLOCK')
    expect(decision.ruleId).toBe('nexus_pol_block_destructive')
  })

  it('requires human approval for large wire transfers', () => {
    const decision = evaluateToolCall({
      policy: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
      toolName: 'wire_transfer',
      toolArgs: { amount: 50_000 },
    })
    expect(decision.action).toBe('REQUIRE_HUMAN')
    expect(decision.ruleId).toBe('nexus_pol_require_approval')
  })

  it('allows benign tool calls', () => {
    const decision = evaluateToolCall({
      policy: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
      toolName: 'query_positions',
      toolArgs: { limit: 10 },
    })
    expect(decision.action).toBe('ALLOW')
    expect(decision.matched).toBe(false)
  })

  it('infers destructive intent from invoke payload text', () => {
    const decision = evaluateInvocation({
      policy: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
      args: ['Delete the users table'],
    })
    expect(decision.action).toBe('BLOCK')
  })

  it('evaluates payload.contains conditions', () => {
    expect(
      evaluateCondition("payload.contains('PII')", {
        payload: 'export customer PII records',
      })
    ).toBe(true)
  })
})
