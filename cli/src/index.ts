#!/usr/bin/env bun

import { resolve } from 'path'
import { graphCommand } from './commands/graph'
import { backlinksCommand } from './commands/backlinks'
import { validateCommand } from './commands/validate'
import { queryCommand } from './commands/query'
import { indexCommand } from './commands/index-gen'
import { searchCommand } from './commands/search'
import { neighborsCommand } from './commands/neighbors'
import { roadmapCommand } from './commands/roadmap'
import { prereqsCommand } from './commands/prereqs'

const args = process.argv.slice(2)
const command = args[0]

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
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

  case 'search': {
    const query = args[1]
    if (!query || query.startsWith('--')) {
      console.error('Usage: dep search <query> [--type <type>] [--audience <id>] [--json]')
      process.exit(1)
    }
    const searchFlags = parseFlags(args.slice(2))
    searchCommand(root, query, {
      type: searchFlags.type as string | undefined,
      audience: searchFlags.audience as string | undefined,
      json: !!searchFlags.json,
    })
    break
  }

  case 'neighbors': {
    const file = args[1]
    if (!file || file.startsWith('--')) {
      console.error('Usage: dep neighbors <file> [--depth <N>] [--follow <rels>] [--direction <in|out|both>] [--json]')
      process.exit(1)
    }
    const nFlags = parseFlags(args.slice(2))
    neighborsCommand(root, file, {
      depth: nFlags.depth ? parseInt(nFlags.depth as string, 10) : undefined,
      follow: nFlags.follow as string | undefined,
      direction: nFlags.direction as string | undefined,
      json: !!nFlags.json,
    })
    break
  }

  case 'roadmap': {
    const audienceId = args[1]
    if (!audienceId || audienceId.startsWith('--')) {
      console.error('Usage: dep roadmap <audience_id> [--json]')
      process.exit(1)
    }
    const rFlags = parseFlags(args.slice(2))
    roadmapCommand(root, audienceId, { json: !!rFlags.json })
    break
  }

  case 'prereqs': {
    const prereqFile = args[1]
    if (!prereqFile || prereqFile.startsWith('--')) {
      console.error('Usage: dep prereqs <file> [--json]')
      process.exit(1)
    }
    const pFlags = parseFlags(args.slice(2))
    prereqsCommand(root, prereqFile, { json: !!pFlags.json })
    break
  }

  default:
    console.log(`dep — Documentation Engineering Protocol CLI

Usage:
  dep graph [--json|--dot|--mermaid]     Build and display the documentation graph
  dep backlinks <file> [--json]         Show what links to a document
  dep validate [--json]                 Validate all documents and graph integrity
  dep query [filters] [--json]          Query documents by metadata
  dep index [--dry|--json]              Auto-generate index files from metadata
  dep search <query> [--type] [--audience] [--json]
                                        Full-text search across documents
  dep neighbors <file> [--depth=N] [--follow=RELS] [--direction=in|out|both] [--json]
                                        Transitive graph traversal
  dep roadmap <audience_id> [--json]    Audience-specific learning path
  dep prereqs <file> [--json]           Prerequisite reading chain

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
