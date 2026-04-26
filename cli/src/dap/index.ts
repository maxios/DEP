import { validateCommand } from './commands/validate'
import { resolveCommand } from './commands/resolve'
import { nodeCommand } from './commands/node'
import { traceCommand } from './commands/trace'
import { graphCommand } from './commands/graph'

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

export function dapCommand(args: string[], dapRoot: string) {
  const subcommand = args[0]

  switch (subcommand) {
    case 'validate': {
      const flags = parseFlags(args.slice(1))
      validateCommand(dapRoot, { json: !!flags.json })
      break
    }

    case 'resolve': {
      const query = args[1]
      if (!query || query.startsWith('--')) {
        console.error('Usage: dep dap resolve <query> [--json] [--root <path>]')
        process.exit(1)
      }
      const flags = parseFlags(args.slice(2))
      resolveCommand(dapRoot, query, { json: !!flags.json })
      break
    }

    case 'node': {
      const treeId = args[1]
      const nodeId = args[2]
      if (!treeId || !nodeId || treeId.startsWith('--') || nodeId.startsWith('--')) {
        console.error('Usage: dep dap node <tree-id> <node-id> [--json] [--root <path>]')
        process.exit(1)
      }
      const flags = parseFlags(args.slice(3))
      nodeCommand(dapRoot, treeId, nodeId, { json: !!flags.json })
      break
    }

    case 'trace': {
      const treeId = args[1]
      if (!treeId || treeId.startsWith('--')) {
        console.error('Usage: dep dap trace <tree-id> [--json] [--root <path>]')
        process.exit(1)
      }
      const flags = parseFlags(args.slice(2))
      traceCommand(dapRoot, treeId, { json: !!flags.json })
      break
    }

    case 'graph': {
      const flags = parseFlags(args.slice(1))
      graphCommand(dapRoot, { json: !!flags.json })
      break
    }

    default:
      console.log(`dep dap \u2014 Decision Action Protocol commands

Usage:
  dep dap validate [--json]                   Validate all trees and graph integrity
  dep dap resolve <query> [--json]            Find matching tree for a trigger
  dep dap node <tree-id> <node-id> [--json]   Load a single node (progressive context)
  dep dap trace <tree-id> [--json]            ASCII visualization of a decision tree
  dep dap graph [--json]                      Delegation graph between trees

Global flags:
  --root <path>                               Project root (passed via dep --root)
  --json                                      Output as JSON (for agent consumption)
`)
  }
}
