import { describe, expect, it } from 'vitest'
import {
  GENESIS_HASH,
  buildAuditPayloadForHash,
  generateAuditHash,
  regulatoryFieldsForAuditHash,
  verifyAuditChain,
  verifyAuditChainDetailed,
} from './chain.js'

describe('@nexus/audit-verify', () => {
  it('verifies v1 genesis entry', () => {
    const createdAt = '2024-01-01T00:00:00.000Z'
    const tenantId = '01TESTTENANT000000000000'
    const payload = buildAuditPayloadForHash({
      resourceType: 'execution',
      resourceId: 'exec1',
      after: '{"ok":true}',
    })
    const hash = generateAuditHash(GENESIS_HASH, createdAt, tenantId, 'execution.completed', payload)
    expect(
      verifyAuditChain([
        {
          id: '1',
          tenantId,
          action: 'execution.completed',
          resourceType: 'execution',
          resourceId: 'exec1',
          after: '{"ok":true}',
          createdAt,
          hash,
          prevHash: null,
        },
      ])
    ).toBe(true)
  })

  it('detects tampered v2 metadata', () => {
    const createdAt = '2024-06-01T12:00:00.000Z'
    const tenantId = '01TESTTENANT000000000000'
    const metadata = {
      hashVersion: 2,
      tool: 'generate_mifid_report',
      actorType: 'agent',
      confidence: 0.95,
      regulatoryRelevance: ['MIFID2'],
    }
    const reg = regulatoryFieldsForAuditHash(metadata)
    const payload = buildAuditPayloadForHash({
      resourceType: 'agent_action',
      resourceId: 'act_1',
      hashVersion: 2,
      ...reg,
    })
    const hash = generateAuditHash(GENESIS_HASH, createdAt, tenantId, 'agent.action.executed', payload)

    const result = verifyAuditChainDetailed([
      {
        id: '1',
        tenantId,
        action: 'agent.action.executed',
        resourceType: 'agent_action',
        resourceId: 'act_1',
        createdAt,
        hash,
        prevHash: null,
        metadata: { ...metadata, tool: 'malicious_tool' },
      },
    ])
    expect(result.valid).toBe(false)
    expect(result.failedAt?.reason).toBe('hash_mismatch')
  })
})
