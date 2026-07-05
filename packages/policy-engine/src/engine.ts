import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { NexusPolicySchema, type NexusPolicy, type NplRule } from './schema.js'
import {
  buildEvaluationContext,
  evaluateCondition,
  type NplEvaluationContext,
} from './evaluator.js'
import { BUNDLED_POLICIES, normalizePolicyReference } from './policies/bundled.js'

export type NplPolicyAction = NplRule['action']

export interface NplPolicyDecision {
  readonly matched: boolean
  readonly action: NplPolicyAction
  readonly ruleId: string
  readonly reason: string
  readonly alertSeverity: NplRule['alertSeverity']
}

export interface EvaluatePolicyInput {
  readonly policy: NexusPolicy | string
  readonly context: NplEvaluationContext
  readonly agentRole?: string
}

/** Load policy from filesystem path (server/gateway use). */
export function loadPolicyFromFile(path: string): NexusPolicy {
  const raw = readFileSync(path, 'utf8')
  return parsePolicyDocument(raw)
}

let bundledPolicies: Record<string, NexusPolicy> | null = null

function getBundledPolicies(): Record<string, NexusPolicy> {
  if (!bundledPolicies) {
    bundledPolicies = { ...BUNDLED_POLICIES }
  }
  return bundledPolicies
}

/** Parse YAML or JSON policy document into validated NexusPolicy. */
export function parsePolicyDocument(source: string): NexusPolicy {
  const trimmed = source.trim()
  const doc = trimmed.startsWith('{') ? JSON.parse(trimmed) : parseYaml(source)
  return NexusPolicySchema.parse(doc)
}

/** Resolve policy by name, inline object, or raw YAML/JSON string. */
export function resolvePolicy(policy: NexusPolicy | string): NexusPolicy {
  if (typeof policy !== 'string') return policy

  const normalized = normalizePolicyReference(policy)
  const bundled = getBundledPolicies()[normalized]
  if (bundled) return bundled

  if (policy.includes('\n') || policy.trim().startsWith('{')) {
    return parsePolicyDocument(policy)
  }

  throw new Error(`Unknown NPL policy: ${policy}`)
}

export function listBundledPolicyNames(): string[] {
  return Object.keys(getBundledPolicies())
}

function agentMatchesPolicy(policy: NexusPolicy, agentRole?: string): boolean {
  if (policy.targetAgents.includes('*')) return true
  if (!agentRole) return true
  return policy.targetAgents.includes(agentRole)
}

const ACTION_PRIORITY: Record<NplPolicyAction, number> = {
  BLOCK: 4,
  REQUIRE_HUMAN: 3,
  SIMULATE: 2,
  ALLOW: 1,
}

/** Evaluate all rules; highest-priority matching action wins (BLOCK > REQUIRE_HUMAN > SIMULATE > ALLOW). */
export function evaluatePolicy(input: EvaluatePolicyInput): NplPolicyDecision {
  const policy = resolvePolicy(input.policy)

  if (!agentMatchesPolicy(policy, input.agentRole ?? input.context.agentRole)) {
    return {
      matched: false,
      action: 'ALLOW',
      ruleId: 'nexus_pol_agent_not_in_scope',
      reason: 'Agent role not targeted by policy',
      alertSeverity: 'LOW',
    }
  }

  const matches: NplPolicyDecision[] = []

  for (const rule of policy.rules) {
    if (evaluateCondition(rule.condition, input.context)) {
      matches.push({
        matched: true,
        action: rule.action,
        ruleId: rule.ruleId,
        reason: `Rule ${rule.ruleId} matched: ${rule.condition}`,
        alertSeverity: rule.alertSeverity,
      })
    }
  }

  if (matches.length === 0) {
    return {
      matched: false,
      action: 'ALLOW',
      ruleId: 'nexus_pol_default_allow',
      reason: 'No NPL rules matched',
      alertSeverity: 'LOW',
    }
  }

  return matches.reduce((best, current) =>
    ACTION_PRIORITY[current.action] > ACTION_PRIORITY[best.action] ? current : best
  )
}

export function evaluateToolCall(input: {
  policy: NexusPolicy | string
  toolName: string
  toolArgs?: Record<string, unknown>
  agentRole?: string
}): NplPolicyDecision {
  return evaluatePolicy({
    policy: input.policy,
    agentRole: input.agentRole,
    context: buildEvaluationContext({
      toolName: input.toolName,
      toolArgs: input.toolArgs,
      agentRole: input.agentRole,
    }),
  })
}

export function evaluateInvocation(input: {
  policy: NexusPolicy | string
  args: unknown[]
  agentRole?: string
}): NplPolicyDecision {
  const first = input.args[0]
  const payload = typeof first === 'string' ? first : undefined
  const toolCall =
    first != null && typeof first === 'object' && !Array.isArray(first)
      ? (first as { toolName?: string; name?: string; args?: Record<string, unknown> })
      : undefined

  const toolName = toolCall?.toolName ?? toolCall?.name
  const toolArgs = toolCall?.args

  return evaluatePolicy({
    policy: input.policy,
    agentRole: input.agentRole,
    context: buildEvaluationContext({
      toolName,
      toolArgs,
      payload,
      agentRole: input.agentRole,
    }),
  })
}

/** Art. 5 execution payload gate via bundled `eu-ai-act-art5-prohibited` NPL policy. */
export function evaluateExecutionPayload(input: {
  args: Record<string, unknown>
  agentRole?: string
  policy?: NexusPolicy | string
}): NplPolicyDecision {
  return evaluatePolicy({
    policy: input.policy ?? 'eu-ai-act-art5-prohibited',
    agentRole: input.agentRole,
    context: buildEvaluationContext({ args: input.args, agentRole: input.agentRole }),
  })
}

/** Reset bundled policy cache (tests). */
export function resetBundledPoliciesForTests(): void {
  bundledPolicies = null
}
