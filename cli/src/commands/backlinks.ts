import { buildGraph } from '../graph'
import { formatBacklinks } from '../output'
import { relative, resolve } from 'path'

export function backlinksCommand(root: string, filePath: string, flags: { json?: boolean }) {
  const graph = buildGraph(root)

  // Normalize path to be relative to project root
  const normalizedPath = relative(root, resolve(root, filePath))
  const node = graph.nodes.get(normalizedPath)

  if (!node) {
    console.error(`Document not found in graph: ${normalizedPath}`)
    process.exit(1)
  }

  if (flags.json) {
    console.log(JSON.stringify({
      path: normalizedPath,
      backlinks: node.backlinks,
    }, null, 2))
  } else {
    console.log(formatBacklinks(normalizedPath, node.backlinks))
  }
}
