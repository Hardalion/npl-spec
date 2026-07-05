export {
  NexusPolicySchema,
  nplRuleSchema,
  nplRuleActionSchema,
  nplAlertSeveritySchema,
  nplPolicyIdSchema,
  CANONICAL_NATO_PROU_STRICT_FINANCIAL,
  CANONICAL_EU_AI_ACT_ART5_PROHIBITED,
  type NexusPolicy,
  type NplRule,
} from './schema.js'

export {
  LEGACY_POLICY_ALIASES,
  normalizePolicyReference,
} from './policies/bundled.js'

export {
  evaluateCondition,
  inferToolFromPayload,
  buildEvaluationContext,
  type NplEvaluationContext,
} from './evaluator.js'

export {
  parsePolicyDocument,
  loadPolicyFromFile,
  resolvePolicy,
  evaluatePolicy,
  evaluateToolCall,
  evaluateInvocation,
  evaluateExecutionPayload,
  listBundledPolicyNames,
  resetBundledPoliciesForTests,
  type NplPolicyDecision,
  type NplPolicyAction,
  type EvaluatePolicyInput,
} from './engine.js'

export {
  HARDALION_POLICY_SCHEME,
  hardalionPolicyUriSchema,
  isHardalionPolicyUri,
  parseHardalionPolicyUri,
  formatHardalionPolicyUri,
  registryRefKey,
  normalizeSemver,
  assertVersionPinned,
  type HardalionPolicyUri,
} from './registry/uri.js'

export {
  POLICY_REGISTRY_CATALOG,
  listPolicyRegistryEntries,
  getPolicyRegistryEntry,
  resolvePolicyRegistryEntry,
  toRegistryResponse,
  type PolicyRegistryEntry,
} from './registry/catalog.js'

export {
  PolicyRegistryClient,
  PolicyRegistryUnavailableError,
  PolicyRegistryVersionMismatchError,
  createRegistryFailClosedDecision,
  REGISTRY_FAIL_CLOSED_RULE_ID,
  type PolicyRegistryClientConfig,
  type PolicyRegistryResolution,
} from './registry/client.js'
