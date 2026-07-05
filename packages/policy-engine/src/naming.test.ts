import { describe, expect, it } from 'vitest'
import {
  CANONICAL_EU_AI_ACT_ART5_PROHIBITED,
  CANONICAL_NATO_PROU_STRICT_FINANCIAL,
  NexusPolicySchema,
} from './schema.js'
import { LEGACY_POLICY_ALIASES, normalizePolicyReference } from './policies/bundled.js'
import { resolvePolicy, listBundledPolicyNames } from './engine.js'
import { getPolicyRegistryEntry } from './registry/catalog.js'

describe('NPL canonical naming', () => {
  it('uses kebab-case policyName in schema', () => {
    expect(() =>
      NexusPolicySchema.parse({
        version: '1.0.0',
        policyName: 'NATO_PRoU_Strict_Financial',
        targetAgents: ['*'],
        rules: [
          {
            ruleId: 'r1',
            action: 'ALLOW',
            condition: "tool.name == 'x'",
            alertSeverity: 'LOW',
          },
        ],
      })
    ).toThrow()
  })

  it('accepts canonical nato-prou-strict-financial', () => {
    const policy = resolvePolicy(CANONICAL_NATO_PROU_STRICT_FINANCIAL)
    expect(policy.policyName).toBe(CANONICAL_NATO_PROU_STRICT_FINANCIAL)
  })

  it('maps legacy aliases to canonical id', () => {
    for (const legacy of Object.keys(LEGACY_POLICY_ALIASES)) {
      expect(normalizePolicyReference(legacy)).toBe(CANONICAL_NATO_PROU_STRICT_FINANCIAL)
      expect(resolvePolicy(legacy).policyName).toBe(CANONICAL_NATO_PROU_STRICT_FINANCIAL)
    }
  })

  it('lists only canonical bundled policy names', () => {
    expect(listBundledPolicyNames()).toEqual([
      CANONICAL_NATO_PROU_STRICT_FINANCIAL,
      CANONICAL_EU_AI_ACT_ART5_PROHIBITED,
    ])
  })

  it('registry catalog matches bundled canonical id', () => {
    const entry = getPolicyRegistryEntry(`${CANONICAL_NATO_PROU_STRICT_FINANCIAL}@1.0.0`)
    expect(entry?.policyId).toBe(CANONICAL_NATO_PROU_STRICT_FINANCIAL)
    expect(entry?.policy.policyName).toBe(CANONICAL_NATO_PROU_STRICT_FINANCIAL)
  })
})
