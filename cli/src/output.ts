import type { DepGraph, DepNode, DepEdge } from './types'

export function formatGraphTree(graph: DepGraph): string {
  const lines: string[] = ['DEP Documentation Graph', '']

  const byType = new Map<string, DepNode[]>()
  for (const [, node] of graph.nodes) {
    const type = node.metadata.type
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(node)
  }

  for (const [type, nodes] of byType) {
    lines.push(`${type}/`)
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const isLast = i === nodes.length - 1
      const prefix = isLast ? '└── ' : '├── '
      const lifecycle = lifecycleIcon(node.lifecycle)
      lines.push(`  ${prefix}${node.path} ${lifecycle} [${node.metadata.confidence}]`)

      if (node.forwardLinks.length > 0) {
        const linkPrefix = isLast ? '      ' : '  │   '
        for (const link of node.forwardLinks) {
          if (link.rel !== 'INLINE') {
            lines.push(`${linkPrefix}→ ${link.rel} ${link.target}`)
          }
        }
      }
    }
    lines.push('')
  }

  if (graph.orphans.length > 0) {
    lines.push('Orphans:')
    for (const orphan of graph.orphans) {
      lines.push(`  ⚠ ${orphan}`)
    }
    lines.push('')
  }

  if (graph.cycles.length > 0) {
    lines.push('Cycles:')
    for (const cycle of graph.cycles) {
      lines.push(`  ⚠ ${cycle.join(' → ')}`)
    }
    lines.push('')
  }

  const stats = `${graph.nodes.size} documents, ${graph.edges.length} edges, ${graph.orphans.length} orphans, ${graph.cycles.length} cycles`
  lines.push(stats)

  return lines.join('\n')
}

export function formatGraphDot(graph: DepGraph): string {
  const lines: string[] = ['digraph DEP {', '  rankdir=LR;', '  node [shape=box, style=rounded];', '']

  // Style by type
  const typeColors: Record<string, string> = {
    tutorial: '#4CAF50',
    'how-to': '#2196F3',
    reference: '#FF9800',
    explanation: '#9C27B0',
    'decision-record': '#F44336',
  }

  for (const [, node] of graph.nodes) {
    const color = typeColors[node.metadata.type] ?? '#607D8B'
    const label = node.path.replace(/\.md$/, '').split('/').pop()
    lines.push(`  "${node.path}" [label="${label}", fillcolor="${color}", style="rounded,filled", fontcolor="white"];`)
  }

  lines.push('')

  for (const edge of graph.edges) {
    if (edge.rel === 'INLINE') continue // skip untyped for cleaner graph
    const style = edge.rel === 'REQUIRES' ? 'bold' : 'solid'
    lines.push(`  "${edge.source}" -> "${edge.target}" [label="${edge.rel}", style=${style}];`)
  }

  lines.push('}')
  return lines.join('\n')
}

export function formatBacklinks(path: string, backlinks: DepEdge[]): string {
  if (backlinks.length === 0) return `No backlinks found for ${path}`

  const byRel = new Map<string, DepEdge[]>()
  for (const link of backlinks) {
    if (!byRel.has(link.rel)) byRel.set(link.rel, [])
    byRel.get(link.rel)!.push(link)
  }

  const lines: string[] = [`Backlinks for ${path}:`, '']
  for (const [rel, edges] of byRel) {
    lines.push(`  ${rel}:`)
    for (const edge of edges) {
      lines.push(`    ← ${edge.source}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function formatQueryResults(nodes: DepNode[]): string {
  if (nodes.length === 0) return 'No documents match the query.'

  const lines: string[] = [`${nodes.length} document(s) found:`, '']
  for (const node of nodes) {
    const lifecycle = lifecycleIcon(node.lifecycle)
    lines.push(`  ${node.path}`)
    lines.push(`    type: ${node.metadata.type} | audience: ${node.metadata.audience.join(', ')} | ${lifecycle} ${node.lifecycle} | confidence: ${node.metadata.confidence}`)
  }

  return lines.join('\n')
}

function lifecycleIcon(state: string): string {
  switch (state) {
    case 'FRESH': return '●'
    case 'AGING': return '◐'
    case 'STALE': return '○'
    default: return '?'
  }
}
