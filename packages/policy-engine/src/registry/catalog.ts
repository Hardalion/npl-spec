/**
 * Immutable versioned policy catalog, federated trust anchor.
 * Publisher org A publishes; org B imports via hardalion:// URI (fail-closed fetch).
 */

import { createHash } from 'node:crypto'
import type { NexusPolicy } from '../schema.js'
import { CANONICAL_NATO_PROU_STRICT_FINANCIAL } from '../schema.js'
import { NexusPolicySchema } from '../schema.js'
import { canonicalJsonStringify } from '../canonical-json.js'
import {
  assertVersionPinned,
  type HardalionPolicyUri,
  registryRefKey,
} from './uri.js'

export interface PolicyRegistryEntry {
  readonly policyId: string
  readonly version: string
  readonly publisher: string
  readonly immutable: true
  readonly publishedAt: string
  readonly contentHash: string
  readonly policy: NexusPolicy
}

function hashPolicy(policy: NexusPolicy): string {
  return createHash('sha256').update(canonicalJsonStringify(policy)).digest('hex')
}

function entryFromPolicy(input: {
  policyId: string
  version: string
  publisher: string
  publishedAt: string
  policy: NexusPolicy
}): PolicyRegistryEntry {
  const policy = NexusPolicySchema.parse({
    ...input.policy,
    version: input.version,
    policyName: input.policyId,
  })
  return {
    policyId: input.policyId,
    version: input.version,
    publisher: input.publisher,
    immutable: true,
    publishedAt: input.publishedAt,
    contentHash: hashPolicy(policy),
    policy,
  }
}

const NATO_PROU_STRICT_FINANCIAL_V1: NexusPolicy = {
  version: '1.0.0',
  policyName: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
  description:
    'Strict financial controls aligned with NATO PRoU governability and reliability principles.',
  targetAgents: ['*'],
  rules: [
    {
      ruleId: 'nexus_pol_block_destructive',
      action: 'BLOCK',
      condition: "tool.name in ['drop_table', 'delete_user']",
      alertSeverity: 'CRITICAL',
    },
    {
      ruleId: 'nexus_pol_require_approval',
      action: 'REQUIRE_HUMAN',
      condition: "tool.name == 'wire_transfer' && args.amount > 10000",
      alertSeverity: 'MEDIUM',
    },
  ],
}

/** Immutable catalog, new versions are new keys; existing pins never mutate. */
export const POLICY_REGISTRY_CATALOG: Readonly<Record<string, PolicyRegistryEntry>> = {
  'nato-prou-strict-financial@1.0.0': entryFromPolicy({
    policyId: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
    version: '1.0.0',
    publisher: 'hardalion',
    publishedAt: '2026-06-01T00:00:00.000Z',
    policy: NATO_PROU_STRICT_FINANCIAL_V1,
  }),
}

export function listPolicyRegistryEntries(): PolicyRegistryEntry[] {
  return Object.values(POLICY_REGISTRY_CATALOG)
}

export function getPolicyRegistryEntry(ref: string): PolicyRegistryEntry | null {
  const key = ref.includes('@') ? ref.toLowerCase() : null
  if (!key) return null
  return POLICY_REGISTRY_CATALOG[key] ?? null
}

export function resolvePolicyRegistryEntry(uri: HardalionPolicyUri): PolicyRegistryEntry | null {
  const key = registryRefKey(uri)
  const entry = POLICY_REGISTRY_CATALOG[key]
  if (!entry) return null
  if (uri.publisher && entry.publisher !== uri.publisher) return null
  assertVersionPinned(uri.version, entry.version, 'Policy registry')
  return entry
}

export function toRegistryResponse(entry: PolicyRegistryEntry) {
  return {
    policyId: entry.policyId,
    version: entry.version,
    publisher: entry.publisher,
    immutable: entry.immutable,
    publishedAt: entry.publishedAt,
    contentHash: entry.contentHash,
    policy: entry.policy,
  }
}
