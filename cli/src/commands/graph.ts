import { buildGraph } from '../graph'
import { formatGraphTree, formatGraphDot } from '../output'

export function graphCommand(root: string, flags: { json?: boolean; dot?: boolean }) {
  const graph = buildGraph(root)

  if (flags.json) {
    const serializable = {
      nodes: Object.fromEntries(
        Array.from(graph.nodes.entries()).map(([k, v]) => [k, {
          path: v.path,
          type: v.metadata.type,
          audience: v.metadata.audience,
          confidence: v.metadata.confidence,
          lifecycle: v.lifecycle,
          forwardLinks: v.forwardLinks,
          backlinks: v.backlinks,
        }])
      ),
      edges: graph.edges,
      orphans: graph.orphans,
      cycles: graph.cycles,
      stats: {
        documents: graph.nodes.size,
        edges: graph.edges.length,
        orphans: graph.orphans.length,
        cycles: graph.cycles.length,
      },
    }
    console.log(JSON.stringify(serializable, null, 2))
  } else if (flags.dot) {
    console.log(formatGraphDot(graph))
  } else {
    console.log(formatGraphTree(graph))
  }
}
