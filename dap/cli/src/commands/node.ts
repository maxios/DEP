import { buildDapGraph } from '../tree-builder'
import { formatNode } from '../output'

export function nodeCommand(dapRoot: string, treeId: string, nodeId: string, flags: { json?: boolean }) {
  const graph = buildDapGraph(dapRoot)
  const tree = graph.trees.get(treeId)

  if (!tree) {
    console.error(`Tree not found: ${treeId}`)
    console.error(`Available trees: ${[...graph.trees.keys()].join(', ')}`)
    process.exit(1)
  }

  const node = tree.nodes.get(nodeId)

  if (!node) {
    console.error(`Node not found: ${nodeId} in tree ${treeId}`)
    console.error(`Available nodes: ${[...tree.nodes.keys()].join(', ')}`)
    process.exit(1)
  }

  if (flags.json) {
    console.log(JSON.stringify({
      tree: treeId,
      node: {
        id: node.id,
        type: node.type,
        description: node.description,
        ...node,
      },
    }, null, 2))
  } else {
    console.log(formatNode(node, treeId))
  }
}
