import { buildDapGraph } from '../tree-builder'
import { formatDelegationGraph } from '../output'

export function graphCommand(dapRoot: string, flags: { json?: boolean }) {
  const graph = buildDapGraph(dapRoot)

  if (flags.json) {
    const trees = [...graph.trees.entries()].map(([id, tree]) => ({
      id,
      path: tree.path,
      trigger: tree.metadata.trigger,
      node_count: tree.nodes.size,
      lifecycle: tree.lifecycle,
      confidence: tree.metadata.confidence,
    }))

    const delegations = graph.delegations.map((d) => ({
      from: d.source,
      to: d.target,
    }))

    console.log(JSON.stringify({ trees, delegations, cycles: graph.cycles }, null, 2))
  } else {
    console.log(formatDelegationGraph(graph))
  }
}
