#!/usr/bin/env bun

import { resolve } from 'path'
import { validateCommand } from './commands/validate'
import { resolveCommand } from './commands/resolve'
import { nodeCommand } from './commands/node'
import { traceCommand } from './commands/trace'
import { graphCommand } from './commands/graph'

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
  case 'validate':
    validateCommand(root, { json: !!flags.json })
    break

  case 'resolve': {
    const query = args[1]
    if (!query || query.startsWith('--')) {
      console.error('Usage: dap resolve <query> [--json] [--root <path>]')
      process.exit(1)
    }
    const rFlags = parseFlags(args.slice(2))
    const rRoot = getRoot(rFlags)
    resolveCommand(rRoot, query, { json: !!rFlags.json })
    break
  }

  case 'node': {
    const treeId = args[1]
    const nodeId = args[2]
    if (!treeId || !nodeId || treeId.startsWith('--') || nodeId.startsWith('--')) {
      console.error('Usage: dap node <tree-id> <node-id> [--json] [--root <path>]')
      process.exit(1)
    }
    const nFlags = parseFlags(args.slice(3))
    const nRoot = getRoot(nFlags)
    nodeCommand(nRoot, treeId, nodeId, { json: !!nFlags.json })
    break
  }

  case 'trace': {
    const treeId = args[1]
    if (!treeId || treeId.startsWith('--')) {
      console.error('Usage: dap trace <tree-id> [--json] [--root <path>]')
      process.exit(1)
    }
    const tFlags = parseFlags(args.slice(2))
    const tRoot = getRoot(tFlags)
    traceCommand(tRoot, treeId, { json: !!tFlags.json })
    break
  }

  case 'graph':
    graphCommand(root, { json: !!flags.json })
    break

  default:
    console.log(`dap \u2014 Decision Action Protocol CLI

Usage:
  dap validate [--json]                   Validate all trees and graph integrity
  dap resolve <query> [--json]            Find matching tree for a trigger
  dap node <tree-id> <node-id> [--json]   Load a single node (progressive context)
  dap trace <tree-id> [--json]            ASCII visualization of a decision tree
  dap graph [--json]                      Delegation graph between trees

Global flags:
  --root <path>                           DAP project root (default: parent of cli/)
  --json                                  Output as JSON (for agent consumption)
`)
}
