#!/usr/bin/env bun

import { resolve } from 'path'
import { graphCommand } from './commands/graph'
import { backlinksCommand } from './commands/backlinks'
import { validateCommand } from './commands/validate'
import { queryCommand } from './commands/query'
import { indexCommand } from './commands/index-gen'

const args = process.argv.slice(2)
const command = args[0]

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    }
  }
  return flags
}

function getRoot(flags: Record<string, string | boolean>): string {
  const root = flags.root as string | undefined
  return root ? resolve(root) : resolve(process.cwd(), '..')
}

const flags = parseFlags(args.slice(1))
const root = getRoot(flags)

switch (command) {
  case 'graph':
    graphCommand(root, { json: !!flags.json, dot: !!flags.dot, mermaid: !!flags.mermaid })
    break

  case 'backlinks': {
    const file = args[1]
    if (!file || file.startsWith('--')) {
      console.error('Usage: dep backlinks <file> [--json]')
      process.exit(1)
    }
    const blFlags = parseFlags(args.slice(2))
    backlinksCommand(root, file, { json: !!blFlags.json })
    break
  }

  case 'validate':
    validateCommand(root, { json: !!flags.json })
    break

  case 'query':
    queryCommand(root, {
      type: flags.type as string,
      audience: flags.audience as string,
      tag: flags.tag as string,
      confidence: flags.confidence as string,
      lifecycle: flags.lifecycle as string,
      owner: flags.owner as string,
      json: !!flags.json,
    })
    break

  case 'index':
    indexCommand(root, { json: !!flags.json, dry: !!flags.dry })
    break

  default:
    console.log(`dep — Documentation Engineering Protocol CLI

Usage:
  dep graph [--json|--dot|--mermaid]     Build and display the documentation graph
  dep backlinks <file> [--json]         Show what links to a document
  dep validate [--json]                 Validate all documents and graph integrity
  dep query [filters] [--json]          Query documents by metadata
  dep index [--dry|--json]              Auto-generate index files from metadata

Query filters:
  --type <type>                         Filter by document type
  --audience <id>                       Filter by audience
  --tag <tag>                           Filter by tag
  --confidence <level>                  Filter by confidence level
  --lifecycle <state>                   Filter by lifecycle state (FRESH|AGING|STALE)
  --owner <owner>                       Filter by owner

Global flags:
  --root <path>                         Project root (default: parent of cli/)
  --json                                Output as JSON (for agent consumption)
`)
}
