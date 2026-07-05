/**
 * hardalion:// policy URI, version-pinned immutable policy references.
 * @example hardalion://nato-prou-strict-financial@1.0.0
 */

import { z } from 'zod'

export const HARDALION_POLICY_SCHEME = 'hardalion' as const

export const hardalionPolicyUriSchema = z.object({
  scheme: z.literal(HARDALION_POLICY_SCHEME),
  policyId: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'policyId must be kebab-case'),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'version must be semver (e.g. 1.0.0)'),
  publisher: z.string().min(1).optional(),
})

export type HardalionPolicyUri = z.infer<typeof hardalionPolicyUriSchema>

const URI_PATTERN =
  /^hardalion:\/\/([a-z0-9]+(?:-[a-z0-9]+)*)@(\d+\.\d+\.\d+)(?:\/publisher\/([a-z0-9-]+))?$/i

export function isHardalionPolicyUri(value: string): boolean {
  return value.trim().toLowerCase().startsWith(`${HARDALION_POLICY_SCHEME}://`)
}

export function parseHardalionPolicyUri(raw: string): HardalionPolicyUri {
  const trimmed = raw.trim()
  const match = URI_PATTERN.exec(trimmed)
  if (!match) {
    throw new Error(
      'Invalid hardalion:// policy URI. Required form: hardalion://{policy-id}@{semver} (e.g. hardalion://nato-prou-strict-financial@1.0.0)'
    )
  }

  return hardalionPolicyUriSchema.parse({
    scheme: HARDALION_POLICY_SCHEME,
    policyId: match[1].toLowerCase(),
    version: normalizeSemver(match[2]),
    publisher: match[3]?.toLowerCase(),
  })
}

export function formatHardalionPolicyUri(uri: HardalionPolicyUri): string {
  const base = `${HARDALION_POLICY_SCHEME}://${uri.policyId}@${uri.version}`
  return uri.publisher ? `${base}/publisher/${uri.publisher}` : base
}

export function registryRefKey(uri: HardalionPolicyUri): string {
  return `${uri.policyId}@${uri.version}`
}

export function normalizeSemver(version: string): string {
  const parts = version.split('.')
  while (parts.length < 3) parts.push('0')
  return parts.slice(0, 3).join('.')
}

export function assertVersionPinned(
  requested: string,
  resolved: string,
  context: string
): void {
  if (normalizeSemver(requested) !== normalizeSemver(resolved)) {
    throw new Error(
      `${context}: requested version ${requested} does not match resolved ${resolved} (immutable pin violation)`
    )
  }
}
