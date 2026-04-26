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
import { setCommand } from './commands/set'
import { bumpCommand } from './commands/bump'
import { tagCommand } from './commands/tag'
import { linkCommand } from './commands/link'
import { vectorizeCommand } from './commands/vectorize'
import { dapCommand } from './dap/index'

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
      console.error('Usage: dep search <query> [--semantic|--hybrid] [--type <type>] [--audience <id>] [--json]')
      process.exit(1)
    }
    const searchFlags = parseFlags(args.slice(2))
    await searchCommand(root, query, {
      type: searchFlags.type as string | undefined,
      audience: searchFlags.audience as string | undefined,
      json: !!searchFlags.json,
      semantic: !!searchFlags.semantic,
      hybrid: !!searchFlags.hybrid,
    })
    break
  }

  case 'vectorize': {
    await vectorizeCommand(root, {
      json: !!flags.json,
      force: !!flags.force,
      provider: flags.provider as string | undefined,
      dry: !!flags.dry,
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

  case 'set': {
    const setFile = args[1]
    if (!setFile || setFile.startsWith('--')) {
      console.error('Usage: dep set <file> --<field> <value> [--dry] [--json]')
      process.exit(1)
    }
    const setFlags = parseFlags(args.slice(2))
    const setRoot = getRoot(setFlags)
    setCommand(setRoot, setFile, { ...setFlags })
    break
  }

  case 'bump': {
    const bumpTarget = args[1]
    const hasBumpTarget = bumpTarget && !bumpTarget.startsWith('--')
    const bumpFlags = parseFlags(hasBumpTarget ? args.slice(2) : args.slice(1))
    const bumpRoot = getRoot(bumpFlags)
    bumpCommand(bumpRoot, hasBumpTarget ? bumpTarget : undefined, {
      json: !!bumpFlags.json,
      dry: !!bumpFlags.dry,
      all: !!bumpFlags.all,
      type: bumpFlags.type as string | undefined,
      audience: bumpFlags.audience as string | undefined,
      tag: bumpFlags.tag as string | undefined,
      confidence: bumpFlags.confidence as string | undefined,
      lifecycle: bumpFlags.lifecycle as string | undefined,
      owner: bumpFlags.owner as string | undefined,
    })
    break
  }

  case 'tag': {
    const tagFile = args[1]
    if (!tagFile || tagFile.startsWith('--')) {
      console.error('Usage: dep tag <file> --add <tag> [--remove <tag>] [--json]')
      process.exit(1)
    }
    const tFlags = parseFlags(args.slice(2))
    const tagRoot = getRoot(tFlags)
    tagCommand(tagRoot, tagFile, {
      add: tFlags.add as string | undefined,
      remove: tFlags.remove as string | undefined,
      json: !!tFlags.json,
    })
    break
  }

  case 'dap': {
    const dapRoot = resolve(root, 'dap')
    dapCommand(args.slice(1), dapRoot)
    break
  }

  case 'link': {
    const linkFile = args[1]
    if (!linkFile || linkFile.startsWith('--')) {
      console.error('Usage: dep link <file> --target <path> --rel <REL> [--remove] [--json]')
      process.exit(1)
    }
    const lFlags = parseFlags(args.slice(2))
    const linkRoot = getRoot(lFlags)
    linkCommand(linkRoot, linkFile, {
      target: lFlags.target as string | undefined,
      rel: lFlags.rel as string | undefined,
      remove: !!lFlags.remove,
      json: !!lFlags.json,
    })
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
  dep search <query> [--semantic|--hybrid] [--type] [--audience] [--json]
                                        Full-text or semantic search across documents
  dep vectorize [--force] [--provider local|openai] [--dry] [--json]
                                        Build/rebuild vector index for semantic search
  dep neighbors <file> [--depth=N] [--follow=RELS] [--direction=in|out|both] [--json]
                                        Transitive graph traversal
  dep roadmap <audience_id> [--json]    Audience-specific learning path
  dep prereqs <file> [--json]           Prerequisite reading chain

Metadata commands:
  dep set <file> --<field> <value>      Set metadata field(s) on a document
  dep bump <file|glob> [--all]          Bump last_verified to now
  dep tag <file> --add/--remove <tag>   Add or remove tags
  dep link <file> --target <p> --rel <R>  Add, update, or remove links

DAP (Decision Action Protocol):
  dep dap validate [--json]              Validate all trees and graph integrity
  dep dap resolve <query> [--json]       Find matching tree for a trigger
  dep dap node <tree> <node> [--json]    Load a single node (progressive context)
  dep dap trace <tree> [--json]          ASCII visualization of a decision tree
  dep dap graph [--json]                 Delegation graph between trees

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
