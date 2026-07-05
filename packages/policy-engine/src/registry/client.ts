/**
 * Policy Registry client, fail-closed remote resolution for hardalion:// URIs.
 */

import { NexusPolicySchema, type NexusPolicy } from '../schema.js'
import {
  getPolicyRegistryEntry,
  resolvePolicyRegistryEntry,
  toRegistryResponse,
  type PolicyRegistryEntry,
} from './catalog.js'
import {
  assertVersionPinned,
  parseHardalionPolicyUri,
  registryRefKey,
  type HardalionPolicyUri,
} from './uri.js'

export const REGISTRY_FAIL_CLOSED_RULE_ID = 'NEXUS_REGISTRY_FAIL_CLOSED' as const

export class PolicyRegistryUnavailableError extends Error {
  readonly code = 'POLICY_REGISTRY_UNAVAILABLE' as const
  readonly uri: string

  constructor(uri: string, cause?: unknown) {
    super(`Policy registry unreachable for ${uri}; fail-closed BLOCK enforced`)
    this.name = 'PolicyRegistryUnavailableError'
    this.uri = uri
    if (cause instanceof Error) this.cause = cause
  }
}

export class PolicyRegistryVersionMismatchError extends Error {
  readonly code = 'POLICY_REGISTRY_VERSION_MISMATCH' as const

  constructor(message: string) {
    super(message)
    this.name = 'PolicyRegistryVersionMismatchError'
  }
}

export interface PolicyRegistryClientConfig {
  readonly baseUrl?: string
  readonly apiKey?: string
  readonly fetchImpl?: typeof fetch
  readonly timeoutMs?: number
}

export interface PolicyRegistryResolution {
  readonly uri: HardalionPolicyUri
  readonly entry: PolicyRegistryEntry
  readonly policy: NexusPolicy
}

export function createRegistryFailClosedDecision(uri: string): {
  matched: true
  action: 'BLOCK'
  ruleId: typeof REGISTRY_FAIL_CLOSED_RULE_ID
  reason: string
  alertSeverity: 'CRITICAL'
} {
  return {
    matched: true,
    action: 'BLOCK',
    ruleId: REGISTRY_FAIL_CLOSED_RULE_ID,
    reason: `Policy registry unreachable for ${uri}; fail-closed per DORA chain-of-custody requirements`,
    alertSeverity: 'CRITICAL',
  }
}

export class PolicyRegistryClient {
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(config: PolicyRegistryClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? 'https://api.hardalion.com').replace(/\/$/, '')
    this.apiKey = config.apiKey
    this.fetchImpl = config.fetchImpl ?? fetch
    this.timeoutMs = config.timeoutMs ?? 10_000
  }

  /** Resolve immutable version-pinned policy. Throws on any failure (fail-closed). */
  async fetchPolicy(rawUri: string): Promise<PolicyRegistryResolution> {
    const uri = parseHardalionPolicyUri(rawUri)
    const local = resolvePolicyRegistryEntry(uri)
    if (local) {
      return { uri, entry: local, policy: local.policy }
    }

    const ref = encodeURIComponent(registryRefKey(uri))
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'nexus-policy-registry/1.0',
    }
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`

    let response: Response
    try {
      response = await this.fetchImpl(
        `${this.baseUrl}/v1/infrastructure/policies/${ref}`,
        {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(this.timeoutMs),
        }
      )
    } catch (error) {
      throw new PolicyRegistryUnavailableError(rawUri, error)
    }

    if (!response.ok) {
      throw new PolicyRegistryUnavailableError(rawUri, new Error(`HTTP ${response.status}`))
    }

    let body: { data?: { policy?: unknown; version?: string; policyId?: string } }
    try {
      body = (await response.json()) as typeof body
    } catch (error) {
      throw new PolicyRegistryUnavailableError(rawUri, error)
    }

    const policy = NexusPolicySchema.parse(body.data?.policy)
    const resolvedVersion = body.data?.version ?? policy.version
    assertVersionPinned(uri.version, resolvedVersion, 'Policy registry response')

    if (body.data?.policyId && body.data.policyId !== uri.policyId) {
      throw new PolicyRegistryVersionMismatchError(
        `Policy id mismatch: requested ${uri.policyId}, received ${body.data.policyId}`
      )
    }

    const entry = getPolicyRegistryEntry(registryRefKey(uri))
    const contentHash =
      entry?.contentHash ??
      (body.data as { contentHash?: string } | undefined)?.contentHash ??
      'remote'

    return {
      uri,
      policy,
      entry: {
        policyId: uri.policyId,
        version: uri.version,
        publisher: entry?.publisher ?? 'remote',
        immutable: true,
        publishedAt: entry?.publishedAt ?? new Date().toISOString(),
        contentHash,
        policy,
      },
    }
  }

  /** Server-side catalog lookup (no network). */
  resolveLocal(rawUri: string): PolicyRegistryResolution | null {
    const uri = parseHardalionPolicyUri(rawUri)
    const entry = resolvePolicyRegistryEntry(uri)
    if (!entry) return null
    return { uri, entry, policy: entry.policy }
  }
}

export { toRegistryResponse }
