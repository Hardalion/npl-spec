import { z } from 'zod'

export const nplRuleActionSchema = z.enum(['ALLOW', 'BLOCK', 'REQUIRE_HUMAN', 'SIMULATE'])

export const nplAlertSeveritySchema = z.enum(['LOW', 'MEDIUM', 'CRITICAL'])

/** Canonical NPL policy id, kebab-case, matches hardalion:// URI policyId segment. */
export const nplPolicyIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'policyName must be kebab-case (e.g. nato-prou-strict-financial)')

export const CANONICAL_NATO_PROU_STRICT_FINANCIAL = 'nato-prou-strict-financial' as const
export const CANONICAL_EU_AI_ACT_ART5_PROHIBITED = 'eu-ai-act-art5-prohibited' as const

export const nplRuleSchema = z.object({
  ruleId: z.string().min(1),
  action: nplRuleActionSchema,
  condition: z.string().min(1),
  alertSeverity: nplAlertSeveritySchema,
})

export type NplRule = z.infer<typeof nplRuleSchema>

export const NexusPolicySchema = z.object({
  version: z.string().min(1),
  policyName: nplPolicyIdSchema,
  description: z.string().optional(),
  targetAgents: z.array(z.string()).min(1),
  rules: z.array(nplRuleSchema).min(1),
})

export type NexusPolicy = z.infer<typeof NexusPolicySchema>
