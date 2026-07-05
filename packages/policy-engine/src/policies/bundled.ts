import type { NexusPolicy } from '../schema.js'
import { CANONICAL_NATO_PROU_STRICT_FINANCIAL, CANONICAL_EU_AI_ACT_ART5_PROHIBITED } from '../schema.js'

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

const EU_AI_ACT_ART5_PROHIBITED_V1: NexusPolicy = {
  version: '1.0.0',
  policyName: CANONICAL_EU_AI_ACT_ART5_PROHIBITED,
  description: 'EU AI Act Article 5 absolute prohibitions: deterministic network-level blocks.',
  targetAgents: ['*'],
  rules: [
    {
      ruleId: 'EU_AI_ACT_ART5_SOCIAL_SCORING',
      action: 'BLOCK',
      condition: "args.actionType == 'EVALUATE_USER_TRUST' && args.metadataSource == 'SOCIAL_BEHAVIOR'",
      alertSeverity: 'CRITICAL',
    },
    {
      ruleId: 'EU_AI_ACT_ART5_MANIPULATION',
      action: 'BLOCK',
      condition: "args.actionType == 'GENERATE_UI_PROMPT' && args.urgencyTactic == 'ARTIFICIAL'",
      alertSeverity: 'CRITICAL',
    },
    {
      ruleId: 'EU_AI_ACT_ART5_BIOMETRIC',
      action: 'BLOCK',
      condition: 'args.hasBiometricInference',
      alertSeverity: 'CRITICAL',
    },
    {
      ruleId: 'EU_AI_ACT_ART5_EMOTION_WORKPLACE',
      action: 'BLOCK',
      condition: "args.actionType == 'INFER_EMOTION' && args.emotionContext == 'WORKPLACE'",
      alertSeverity: 'CRITICAL',
    },
    {
      ruleId: 'EU_AI_ACT_ART5_CRIMINAL_PROFILING',
      action: 'BLOCK',
      condition: "args.actionType == 'CRIMINAL_RISK_PROFILE' && args.criminalBasedOn == 'PHYSICAL_BEHAVIOR'",
      alertSeverity: 'CRITICAL',
    },
  ],
}

/** Canonical bundled policies keyed by policyName (kebab-case). */
export const BUNDLED_POLICIES: Record<string, NexusPolicy> = {
  [CANONICAL_NATO_PROU_STRICT_FINANCIAL]: NATO_PROU_STRICT_FINANCIAL_V1,
  [CANONICAL_EU_AI_ACT_ART5_PROHIBITED]: EU_AI_ACT_ART5_PROHIBITED_V1,
}

/**
 * @deprecated Legacy SCREAMING_SNAKE aliases, resolve to canonical kebab-case id.
 * Removed in NPL v2; use `nato-prou-strict-financial` or hardalion:// URI.
 */
export const LEGACY_POLICY_ALIASES: Readonly<Record<string, string>> = {
  NATO_PRoU_Strict_Financial: CANONICAL_NATO_PROU_STRICT_FINANCIAL,
  'NATO-PRoU-Strict-Financial': CANONICAL_NATO_PROU_STRICT_FINANCIAL,
}

export function normalizePolicyReference(ref: string): string {
  const trimmed = ref.trim()
  return LEGACY_POLICY_ALIASES[trimmed] ?? trimmed.toLowerCase()
}
