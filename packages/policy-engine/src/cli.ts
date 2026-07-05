#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateToolCall, loadPolicyFromFile } from './engine.js'
import { PolicyRegistryClient } from './registry/client.js'
import { CANONICAL_NATO_PROU_STRICT_FINANCIAL } from './schema.js'

export interface PolicyEvalCliInput {
  readonly toolName: string
  readonly toolArgs?: Record<string, unknown>
  readonly agentRole?: string
  readonly policy?: string
  readonly policyFile?: string
  readonly policyUri?: string
  readonly json?: boolean
}

export function parsePolicyEvalArgs(argv: string[]): PolicyEvalCliInput {
  const args = argv.filter((a) => a !== '--')
  if (args.includes('-h') || args.includes('--help')) {
    throw new Error('help')
  }

  const toolIdx = args.indexOf('--tool')
  if (toolIdx === -1 || !args[toolIdx + 1]) {
    throw new Error('missing_tool')
  }

  const policyIdx = args.indexOf('--policy')
  const policyFileIdx = args.indexOf('--policy-file')
  const policyUriIdx = args.indexOf('--policy-uri')
  const argsIdx = args.indexOf('--args')
  const agentIdx = args.indexOf('--agent')

  let toolArgs: Record<string, unknown> | undefined
  if (argsIdx !== -1 && args[argsIdx + 1]) {
    toolArgs = JSON.parse(args[argsIdx + 1]!) as Record<string, unknown>
  }

  return {
    toolName: args[toolIdx + 1]!,
    toolArgs,
    agentRole: agentIdx !== -1 ? args[agentIdx + 1] : undefined,
    policy: policyIdx !== -1 ? args[policyIdx + 1] : undefined,
    policyFile: policyFileIdx !== -1 ? args[policyFileIdx + 1] : undefined,
    policyUri: policyUriIdx !== -1 ? args[policyUriIdx + 1] : undefined,
    json: args.includes('--json'),
  }
}

export async function runPolicyEval(input: PolicyEvalCliInput) {
  let policy: string | ReturnType<typeof loadPolicyFromFile> =
    input.policy ?? CANONICAL_NATO_PROU_STRICT_FINANCIAL

  if (input.policyFile) {
    policy = loadPolicyFromFile(resolve(input.policyFile))
  } else if (input.policyUri) {
    const client = new PolicyRegistryClient()
    const local = client.resolveLocal(input.policyUri)
    if (!local) {
      const remote = await client.fetchPolicy(input.policyUri)
      policy = remote.policy
    } else {
      policy = local.policy
    }
  }

  return evaluateToolCall({
    policy,
    toolName: input.toolName,
    toolArgs: input.toolArgs,
    agentRole: input.agentRole,
  })
}

function printUsage(): never {
  console.error(`Usage: nexus-policy-eval --tool <name> [options]

Evaluate an NPL policy against a tool call. No account required for bundled policies.

Options:
  --policy <id>           Bundled policy id (default: nato-prou-strict-financial)
  --policy-file <path>    Load policy from YAML/JSON file
  --policy-uri <uri>      Resolve hardalion://policy@version (local catalog, then registry)
  --args <json>           Tool arguments as JSON object
  --agent <role>          Agent role for targetAgents scoping
  --json                  Print full decision JSON

Examples:
  nexus-policy-eval --tool drop_table
  nexus-policy-eval --tool wire_transfer --args '{"amount":50000}'
  nexus-policy-eval --policy-file ./my-policy.yaml --tool delete_user
  nexus-policy-eval --policy-uri hardalion://nato-prou-strict-financial@1.0.0 --tool drop_table`)
  process.exit(2)
}

async function main() {
  try {
    const input = parsePolicyEvalArgs(process.argv.slice(2))
    const decision = await runPolicyEval(input)

    if (input.json) {
      console.log(JSON.stringify(decision, null, 2))
    } else {
      console.log(`action: ${decision.action}`)
      console.log(`ruleId: ${decision.ruleId}`)
      console.log(`matched: ${decision.matched}`)
      console.log(`reason: ${decision.reason}`)
      console.log(`alertSeverity: ${decision.alertSeverity}`)
    }

    process.exit(decision.action === 'BLOCK' ? 1 : 0)
  } catch (error) {
    if (error instanceof Error && error.message === 'help') printUsage()
    if (error instanceof Error && error.message === 'missing_tool') printUsage()
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : ''
const isDirectRun = entryPath === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  })
}
