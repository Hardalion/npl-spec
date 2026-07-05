#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { verifyAuditChainDetailed, type AuditEntryWithChain } from './chain.js'

function usage(): never {
  console.error(`Usage: nexus-audit-verify <audit-export.json|jsonl> [--verbose]

Verifies the cryptographic hash chain of a Hardalion Nexus audit export.
No network access. No Hardalion account required.

Export format: JSON array or JSONL of audit entries (ordered by createdAt).
Required fields per entry: id, tenantId, action, resourceType, resourceId, createdAt, hash, prevHash`)
  process.exit(2)
}

function parseExport(raw: string): AuditEntryWithChain[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown
    if (!Array.isArray(parsed)) throw new Error('JSON root must be an array')
    return parsed as AuditEntryWithChain[]
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      try {
        return JSON.parse(line) as AuditEntryWithChain
      } catch {
        throw new Error(`Invalid JSONL at line ${i + 1}`)
      }
    })
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--')
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) usage()

  const verbose = args.includes('--verbose') || args.includes('-v')
  const fileArg = args.find((a) => !a.startsWith('-'))
  if (!fileArg) usage()

  const path = resolve(fileArg)
  const raw = readFileSync(path, 'utf8')
  const entries = parseExport(raw)
  const result = verifyAuditChainDetailed(entries)

  if (verbose) {
    console.log(`entries: ${result.count}`)
    console.log(`valid: ${result.valid}`)
    if (result.failedAt) {
      console.log(
        `failed_at: index=${result.failedAt.index} id=${result.failedAt.id} reason=${result.failedAt.reason}`
      )
    }
  } else if (result.valid) {
    console.log(`OK (${result.count} entries)`)
  } else if (result.failedAt) {
    console.error(
      `INVALID at index ${result.failedAt.index} (${result.failedAt.id}): ${result.failedAt.reason}`
    )
  } else {
    console.error('INVALID')
  }

  process.exit(result.valid ? 0 : 1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
