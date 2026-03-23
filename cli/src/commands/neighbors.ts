import { buildGraph } from '../graph'
import { resolve, relative } from 'path'

interface NeighborEntry {
  path: string
  depth: number
  rel: string
  direction: 'outgoing' | 'incoming'
  via: string[]
}

export function neighborsCommand(
  root: string,
  file: string,
  flags: { depth?: number; follow?: string; direction?: string; json?: boolean }
) {
  const graph = buildGraph(root)
  const maxDepth = flags.depth ?? 2
  const followRels = flags.follow ? flags.follow.split(',').map((r) => r.trim()) : null
  const dir = flags.direction ?? 'both'

  // Normalize file path
  const normalized = relative(root, resolve(root, file))
  if (!graph.nodes.has(normalized)) {
    console.error(`Document not found in graph: ${normalized}`)
    process.exit(1)
  }

  const visited = new Set<string>([normalized])
  const results: NeighborEntry[] = []
  const queue: Array<{ path: string; depth: number; via: string[] }> = [
    { path: normalized, depth: 0, via: [] },
  ]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.depth >= maxDepth) continue

    const node = graph.nodes.get(current.path)
    if (!node) continue

    // Follow forward links (outgoing)
    if (dir === 'out' || dir === 'both') {
      for (const edge of node.forwardLinks) {
        if (followRels && !followRels.includes(edge.rel)) continue
        if (visited.has(edge.target)) continue
        if (!graph.nodes.has(edge.target)) continue

        visited.add(edge.target)
        const via = current.depth > 0 ? [...current.via, current.path] : []
        results.push({
          path: edge.target,
          depth: current.depth + 1,
          rel: edge.rel,
          direction: 'outgoing',
          via,
        })
        queue.push({ path: edge.target, depth: current.depth + 1, via })
      }
    }

    // Follow backlinks (incoming)
    if (dir === 'in' || dir === 'both') {
      for (const edge of node.backlinks) {
        if (followRels && !followRels.includes(edge.rel)) continue
        if (visited.has(edge.source)) continue
        if (!graph.nodes.has(edge.source)) continue

        visited.add(edge.source)
        const via = current.depth > 0 ? [...current.via, current.path] : []
        results.push({
          path: edge.source,
          depth: current.depth + 1,
          rel: edge.rel,
          direction: 'incoming',
          via,
        })
        queue.push({ path: edge.source, depth: current.depth + 1, via })
      }
    }
  }

  if (flags.json) {
    console.log(JSON.stringify({ start: normalized, maxDepth, results }, null, 2))
    return
  }

  if (results.length === 0) {
    console.log(`No neighbors found for ${normalized} within depth ${maxDepth}`)
    return
  }

  console.log(`Neighbors of ${normalized} (depth: ${maxDepth})`)
  console.log()

  // Group by depth
  const byDepth = new Map<number, NeighborEntry[]>()
  for (const r of results) {
    if (!byDepth.has(r.depth)) byDepth.set(r.depth, [])
    byDepth.get(r.depth)!.push(r)
  }

  for (const [depth, entries] of byDepth) {
    console.log(`  Depth ${depth}:`)
    for (const entry of entries) {
      const arrow = entry.direction === 'outgoing' ? '\u2192' : '\u2190'
      const viaStr = entry.via.length > 0 ? ` (via ${entry.via[entry.via.length - 1].split('/').pop()})` : ''
      console.log(`    ${arrow} ${entry.rel} ${entry.path}${viaStr}`)
    }
    console.log()
  }

  console.log(`${results.length} documents reachable within ${maxDepth} hops`)
}
