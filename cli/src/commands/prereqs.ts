import { buildGraph } from '../graph'
import { extractTitle } from '../parser'
import { resolve, relative, join } from 'path'

export function prereqsCommand(
  root: string,
  file: string,
  flags: { json?: boolean }
) {
  const graph = buildGraph(root)

  // Normalize file path
  const normalized = relative(root, resolve(root, file))
  if (!graph.nodes.has(normalized)) {
    console.error(`Document not found in graph: ${normalized}`)
    process.exit(1)
  }

  const visited = new Set<string>()
  const order: string[] = []
  let hasCycle = false

  // DFS post-order through REQUIRES edges
  function dfs(path: string, stack: Set<string>) {
    if (stack.has(path)) {
      hasCycle = true
      return
    }
    if (visited.has(path)) return

    visited.add(path)
    stack.add(path)

    const node = graph.nodes.get(path)
    if (node) {
      for (const edge of node.forwardLinks) {
        if (edge.rel === 'REQUIRES' && graph.nodes.has(edge.target)) {
          dfs(edge.target, stack)
        }
      }
    }

    stack.delete(path)
    order.push(path)
  }

  dfs(normalized, new Set())

  // Remove the target itself from the chain, reverse to get reading order
  const chain = order.filter((p) => p !== normalized).reverse()

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          target: normalized,
          chain: chain.map((p) => ({
            path: p,
            title: extractTitle(join(root, p)),
          })),
          hasCycle,
        },
        null,
        2
      )
    )
    return
  }

  const targetTitle = extractTitle(join(root, normalized))

  if (chain.length === 0) {
    console.log(`${targetTitle} has no prerequisites.`)
    return
  }

  console.log(`Prerequisites for: ${normalized}`)
  console.log()
  console.log('  Read in this order:')

  for (let i = 0; i < chain.length; i++) {
    const title = extractTitle(join(root, chain[i]))
    console.log(`  ${i + 1}. ${title} (${chain[i]})`)
  }

  console.log()
  console.log(`  Then read: ${targetTitle}`)

  if (hasCycle) {
    console.log()
    console.log('  Warning: circular REQUIRES dependency detected in the chain.')
  }
}
