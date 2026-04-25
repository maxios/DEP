import { buildDapGraph } from '../tree-builder'
import { formatTrace } from '../output'

export function traceCommand(dapRoot: string, treeId: string, flags: { json?: boolean }) {
  const graph = buildDapGraph(dapRoot)
  const tree = graph.trees.get(treeId)

  if (!tree) {
    console.error(`Tree not found: ${treeId}`)
    console.error(`Available trees: ${[...graph.trees.keys()].join(', ')}`)
    process.exit(1)
  }

  if (flags.json) {
    // JSON output: all paths from entry to terminals
    const paths = collectPaths(tree)
    console.log(JSON.stringify({
      tree: treeId,
      entry_node: tree.metadata.entry_node,
      node_count: tree.nodes.size,
      paths,
    }, null, 2))
  } else {
    console.log(formatTrace(tree))
  }
}

function collectPaths(tree: import('../types').DapTree): string[][] {
  const paths: string[][] = []
  const visited = new Set<string>()

  function dfs(nodeId: string, currentPath: string[]) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = tree.nodes.get(nodeId)
    if (!node) return

    const newPath = [...currentPath, nodeId]

    // Collect all next targets
    const targets: string[] = []
    if (node.next) targets.push(node.next)
    if (node.on_success) targets.push(node.on_success)
    if (node.on_failure) targets.push(node.on_failure)
    if (node.on_return) targets.push(node.on_return)
    if (node.conditions) {
      for (const cond of node.conditions) {
        targets.push(cond.next)
      }
    }

    if (targets.length === 0 || node.terminal) {
      paths.push(newPath)
    } else {
      for (const target of targets) {
        dfs(target, newPath)
      }
    }

    visited.delete(nodeId)
  }

  dfs(tree.metadata.entry_node, [])
  return paths
}
