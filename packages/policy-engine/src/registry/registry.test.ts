import { describe, expect, it } from 'vitest'
import {
  formatHardalionPolicyUri,
  isHardalionPolicyUri,
  normalizeSemver,
  parseHardalionPolicyUri,
} from './uri.js'
import {
  getPolicyRegistryEntry,
  listPolicyRegistryEntries,
  resolvePolicyRegistryEntry,
} from './catalog.js'
import {
  PolicyRegistryClient,
  PolicyRegistryUnavailableError,
  createRegistryFailClosedDecision,
} from './client.js'

describe('hardalion:// policy URI', () => {
  it('requires version pinning', () => {
    expect(() => parseHardalionPolicyUri('hardalion://nato-prou-strict-financial')).toThrow(
      /Required form/
    )
  })

  it('parses version-pinned URI', () => {
    const uri = parseHardalionPolicyUri('hardalion://nato-prou-strict-financial@1.0.0')
    expect(uri.policyId).toBe('nato-prou-strict-financial')
    expect(uri.version).toBe('1.0.0')
    expect(formatHardalionPolicyUri(uri)).toBe('hardalion://nato-prou-strict-financial@1.0.0')
  })

  it('detects hardalion URIs', () => {
    expect(isHardalionPolicyUri('hardalion://demo@1.0.0')).toBe(true)
    expect(isHardalionPolicyUri('NATO_PRoU_Strict_Financial')).toBe(false)
  })

  it('normalizes semver components', () => {
    expect(normalizeSemver('1.0')).toBe('1.0.0')
  })
})

describe('policy registry catalog', () => {
  it('lists immutable entries', () => {
    const entries = listPolicyRegistryEntries()
    expect(entries.some((e) => e.policyId === 'nato-prou-strict-financial')).toBe(true)
  })

  it('resolves pinned version only', () => {
    const entry = getPolicyRegistryEntry('nato-prou-strict-financial@1.0.0')
    expect(entry?.immutable).toBe(true)
    expect(entry?.version).toBe('1.0.0')
    expect(resolvePolicyRegistryEntry(parseHardalionPolicyUri('hardalion://nato-prou-strict-financial@1.0.0'))).not.toBeNull()
    expect(resolvePolicyRegistryEntry(parseHardalionPolicyUri('hardalion://nato-prou-strict-financial@9.9.9'))).toBeNull()
  })
})

describe('PolicyRegistryClient fail-closed', () => {
  it('returns local catalog without network', async () => {
    const client = new PolicyRegistryClient()
    const resolved = await client.fetchPolicy('hardalion://nato-prou-strict-financial@1.0.0')
    expect(resolved.policy.policyName).toBe('nato-prou-strict-financial')
  })

  it('blocks when registry is unreachable', async () => {
    const client = new PolicyRegistryClient({
      baseUrl: 'https://registry.invalid',
      fetchImpl: async () => {
        throw new Error('network down')
      },
    })

    await expect(
      client.fetchPolicy('hardalion://unknown-policy@1.0.0')
    ).rejects.toBeInstanceOf(PolicyRegistryUnavailableError)
  })

  it('fetches remote registry document when not in local catalog', async () => {
    const remotePolicy = {
      version: '1.0.0',
      policyName: 'remote-pilot-policy',
      targetAgents: ['*'],
      rules: [
        {
          ruleId: 'remote_block',
          action: 'BLOCK',
          condition: "tool.name == 'blocked_tool'",
          alertSeverity: 'CRITICAL',
        },
      ],
    }

    const client = new PolicyRegistryClient({
      baseUrl: 'https://registry.test',
      fetchImpl: async () =>
        ({
          ok: true,
          json: async () => ({
            data: {
              policyId: 'remote-pilot-policy',
              version: '1.0.0',
              policy: remotePolicy,
            },
          }),
        }) as Response,
    })

    const resolved = await client.fetchPolicy('hardalion://remote-pilot-policy@1.0.0')
    expect(resolved.policy.policyName).toBe('remote-pilot-policy')
  })

  it('rejects version mismatch from remote registry', async () => {
    const client = new PolicyRegistryClient({
      baseUrl: 'https://registry.test',
      fetchImpl: async () =>
        ({
          ok: true,
          json: async () => ({
            data: {
              policyId: 'remote-pilot-policy',
              version: '9.9.9',
              policy: {
                version: '9.9.9',
                policyName: 'remote-pilot-policy',
                targetAgents: ['*'],
                rules: [
                  {
                    ruleId: 'r',
                    action: 'BLOCK',
                    condition: "tool.name == 'x'",
                    alertSeverity: 'LOW',
                  },
                ],
              },
            },
          }),
        }) as Response,
    })

    await expect(
      client.fetchPolicy('hardalion://remote-pilot-policy@1.0.0')
    ).rejects.toThrow()
  })

  it('exposes fail-closed decision shape for audit chain', () => {
    const decision = createRegistryFailClosedDecision('hardalion://missing@1.0.0')
    expect(decision.action).toBe('BLOCK')
    expect(decision.ruleId).toBe('NEXUS_REGISTRY_FAIL_CLOSED')
  })
})
