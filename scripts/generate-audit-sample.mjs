import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GENESIS_HASH,
  buildAuditPayloadForHash,
  generateAuditHash,
  regulatoryFieldsForAuditHash,
} from '../packages/audit-verify/dist/chain.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tenantId = '01DEMOPILOTTENANT000000'
const createdAt1 = '2026-07-04T10:00:00.000Z'
const meta1 = {
  hashVersion: 2,
  tool: 'drop_table',
  actorType: 'agent',
  confidence: 1,
  regulatoryRelevance: ['DORA'],
}
const reg1 = regulatoryFieldsForAuditHash(meta1)
const payload1 = buildAuditPayloadForHash({
  resourceType: 'agent_action',
  resourceId: 'act_demo_1',
  hashVersion: 2,
  ...reg1,
})
const hash1 = generateAuditHash(GENESIS_HASH, createdAt1, tenantId, 'agent.policy.blocked', payload1)

const createdAt2 = '2026-07-04T10:00:01.000Z'
const meta2 = {
  hashVersion: 2,
  tool: 'query_positions',
  actorType: 'agent',
  confidence: 0.92,
  regulatoryRelevance: ['MIFID2'],
}
const reg2 = regulatoryFieldsForAuditHash(meta2)
const payload2 = buildAuditPayloadForHash({
  resourceType: 'agent_action',
  resourceId: 'act_demo_2',
  hashVersion: 2,
  ...reg2,
})
const hash2 = generateAuditHash(hash1, createdAt2, tenantId, 'agent.action.executed', payload2)

writeFileSync(
  join(root, 'examples/audit-export.sample.json'),
  `${JSON.stringify(
    [
      {
        id: 'demo_1',
        tenantId,
        action: 'agent.policy.blocked',
        resourceType: 'agent_action',
        resourceId: 'act_demo_1',
        createdAt: createdAt1,
        hash: hash1,
        prevHash: null,
        metadata: meta1,
      },
      {
        id: 'demo_2',
        tenantId,
        action: 'agent.action.executed',
        resourceType: 'agent_action',
        resourceId: 'act_demo_2',
        createdAt: createdAt2,
        hash: hash2,
        prevHash: hash1,
        metadata: meta2,
      },
    ],
    null,
    2
  )}\n`
)

console.log('wrote examples/audit-export.sample.json')
