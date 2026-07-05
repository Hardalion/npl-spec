/**
 * Tamper-evident audit hash chain verification (v1 + v2).
 * Algorithm matches @nexus/security signing.ts, verifiable without Hardalion servers.
 */

import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

const DELIMITER = '\n'

export const GENESIS_HASH = '0'.repeat(64)

export interface AuditEntry {
  id: string
  tenantId: string
  userId?: string
  agentId?: string
  action: string
  resourceType: string
  resourceId: string
  before?: string
  after?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface AuditEntryWithChain extends AuditEntry {
  hash: string
  prevHash: string | null
  metadata?: Record<string, unknown> | null
}

export interface AuditPayloadForHash {
  resourceType: string
  resourceId: string
  before?: string
  after?: string
  userId?: string
  agentId?: string
  ipAddress?: string
  userAgent?: string
  hashVersion?: 1 | 2
  tool?: string
  confidence?: string
  regulatoryRelevance?: string
  actorType?: string
}

export interface VerifyAuditChainResult {
  valid: boolean
  count: number
  failedAt?: {
    index: number
    id: string
    reason: 'prev_hash_mismatch' | 'hash_mismatch'
  }
}

function sortedJsonObject(obj: Record<string, string>): string {
  const keys = Object.keys(obj).sort()
  const out: Record<string, string> = {}
  for (const k of keys) out[k] = obj[k]!
  return JSON.stringify(out)
}

export function buildAuditPayloadForHash(payload: AuditPayloadForHash): string {
  if (payload.hashVersion === 2) {
    const obj: Record<string, string> = { hashVersion: '2' }
    const baseKeys = [
      'resourceType',
      'resourceId',
      'before',
      'after',
      'userId',
      'agentId',
      'ipAddress',
      'userAgent',
    ] as const
    for (const k of baseKeys) {
      const v = payload[k]
      if (v !== undefined && v !== null && String(v) !== '') obj[k] = String(v)
    }
    for (const k of ['tool', 'actorType', 'confidence', 'regulatoryRelevance'] as const) {
      const v = payload[k]
      if (v !== undefined && v !== null && String(v) !== '') obj[k] = String(v)
    }
    return sortedJsonObject(obj)
  }

  const v1: Record<string, string> = {}
  const keys = ['resourceType', 'resourceId', 'before', 'after', 'userId', 'agentId', 'ipAddress', 'userAgent'] as const
  for (const k of keys) {
    const v = payload[k]
    if (v !== undefined && v !== null && String(v) !== '') v1[k] = String(v)
  }
  return sortedJsonObject(v1)
}

export function regulatoryFieldsForAuditHash(metadata: Record<string, unknown> | null | undefined): {
  tool?: string
  confidence?: string
  regulatoryRelevance?: string
  actorType?: string
} {
  if (!metadata || typeof metadata !== 'object') return {}
  const tool = metadata.tool != null ? String(metadata.tool) : undefined
  const actorType = metadata.actorType != null ? String(metadata.actorType) : undefined
  const confidence =
    metadata.confidence !== undefined && metadata.confidence !== null
      ? String(Number(metadata.confidence))
      : undefined
  let regulatoryRelevance: string | undefined
  if (Array.isArray(metadata.regulatoryRelevance)) {
    regulatoryRelevance = JSON.stringify(
      [...metadata.regulatoryRelevance].map((x) => String(x)).sort((a, b) => a.localeCompare(b))
    )
  }
  return { tool, actorType, confidence, regulatoryRelevance }
}

export function isAuditHashVersion2(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  const v = metadata.hashVersion
  return v === 2 || v === '2'
}

export function generateAuditHash(
  prevHash: string,
  timestampIso: string,
  tenantId: string,
  action: string,
  maskedPayload: string
): string {
  const content = [prevHash, timestampIso, tenantId, action, maskedPayload].join(DELIMITER)
  return bytesToHex(sha256(new TextEncoder().encode(content)))
}

export function auditVerificationPayload(entry: {
  resourceType: string
  resourceId: string
  before?: string
  after?: string
  userId?: string
  agentId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown> | null
}): string {
  const base = {
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    before: entry.before,
    after: entry.after,
    userId: entry.userId,
    agentId: entry.agentId,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  }
  if (isAuditHashVersion2(entry.metadata ?? null)) {
    return buildAuditPayloadForHash({
      ...base,
      hashVersion: 2,
      ...regulatoryFieldsForAuditHash(entry.metadata ?? null),
    })
  }
  return buildAuditPayloadForHash(base)
}

/**
 * Verify an ordered audit export (subset-safe: seeds chain from first entry prevHash).
 */
export function verifyAuditChainDetailed(entries: AuditEntryWithChain[]): VerifyAuditChainResult {
  if (entries.length === 0) return { valid: true, count: 0 }

  let expectedPrevHash = entries[0]?.prevHash ?? GENESIS_HASH

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!
    const entryPrevHash = entry.prevHash ?? GENESIS_HASH

    if (entryPrevHash !== expectedPrevHash) {
      return {
        valid: false,
        count: entries.length,
        failedAt: { index, id: entry.id, reason: 'prev_hash_mismatch' },
      }
    }

    const payload = auditVerificationPayload({ ...entry, metadata: entry.metadata ?? null })
    const expectedHash = generateAuditHash(
      expectedPrevHash,
      entry.createdAt,
      entry.tenantId,
      entry.action,
      payload
    )

    if (entry.hash !== expectedHash) {
      return {
        valid: false,
        count: entries.length,
        failedAt: { index, id: entry.id, reason: 'hash_mismatch' },
      }
    }

    expectedPrevHash = entry.hash
  }

  return { valid: true, count: entries.length }
}

export function verifyAuditChain(entries: AuditEntryWithChain[]): boolean {
  return verifyAuditChainDetailed(entries).valid
}
