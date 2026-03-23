import { readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { parseDocument } from './parser'
import { loadDocspec } from './config'
import type { DepGraph, DepNode, DepEdge, DocspecConfig } from './types'

export function buildGraph(projectRoot: string): DepGraph {
  const config = loadDocspec(projectRoot)
  const mdFiles = findMarkdownFiles(projectRoot, config)
  // Also include seed.md if it exists
  const seedPath = join(projectRoot, 'seed.md')
  if (existsSync(seedPath)) {
    const rel = relative(projectRoot, seedPath)
    if (!mdFiles.includes(rel)) mdFiles.push(rel)
  }

  const nodes = new Map<string, DepNode>()
  const allEdges: DepEdge[] = []

  // Parse all documents
  for (const relPath of mdFiles) {
    const fullPath = join(projectRoot, relPath)
    const parsed = parseDocument(fullPath, projectRoot)
    if (!parsed) continue

    const forwardLinks = [...parsed.typedLinks]
    // Add inline links that don't duplicate typed links
    for (const inline of parsed.inlineLinks) {
      const isDuplicate = forwardLinks.some((e) => e.target === inline.target)
      if (!isDuplicate) forwardLinks.push(inline)
    }

    const node: DepNode = {
      path: parsed.path,
      metadata: parsed.metadata,
      forwardLinks,
      backlinks: [],
      lifecycle: computeLifecycle(parsed.metadata, config),
    }

    nodes.set(parsed.path, node)
    allEdges.push(...forwardLinks)
  }

  // Compute backlinks
  for (const edge of allEdges) {
    const targetNode = nodes.get(edge.target)
    if (targetNode) {
      targetNode.backlinks.push(edge)
    }
  }

  // Detect orphans
  const orphans = detectOrphans(nodes, config)

  // Detect cycles
  const cycles = detectCycles(nodes)

  return { nodes, edges: allEdges, orphans, cycles }
}

function findMarkdownFiles(root: string, config: DocspecConfig): string[] {
  const docsRoot = join(root, config.project.docs_root)
  const files: string[] = []

  function walk(dir: string) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (entry.endsWith('.md')) {
        files.push(relative(root, fullPath))
      }
    }
  }

  walk(docsRoot)
  return files
}

function computeLifecycle(
  metadata: { last_verified: string; type: string },
  config: DocspecConfig
): 'FRESH' | 'AGING' | 'STALE' {
  const lastVerified = new Date(metadata.last_verified)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24))

  const typeName = metadata.type === 'decision-record' ? 'decision-record' : metadata.type
  const cadence = config.governance.review_cadence[typeName] ?? 90

  if (daysSince <= cadence) return 'FRESH'
  if (daysSince <= cadence * 2) return 'AGING'
  return 'STALE'
}

function detectOrphans(nodes: Map<string, DepNode>, config: DocspecConfig): string[] {
  const reachable = new Set<string>()

  // Start BFS from all audience entry points
  const queue: string[] = []
  for (const audience of config.audiences) {
    const entryPoint = audience.entry_point.replace(/^\.\//, '')
    if (nodes.has(entryPoint)) {
      queue.push(entryPoint)
      reachable.add(entryPoint)
    }
  }

  // Also treat index files as reachable roots
  for (const [path] of nodes) {
    if (path.endsWith('index.md')) {
      if (!reachable.has(path)) {
        queue.push(path)
        reachable.add(path)
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const node = nodes.get(current)
    if (!node) continue

    for (const edge of node.forwardLinks) {
      if (!reachable.has(edge.target) && nodes.has(edge.target)) {
        reachable.add(edge.target)
        queue.push(edge.target)
      }
    }
  }

  // Anything not reachable is an orphan
  const orphans: string[] = []
  for (const [path] of nodes) {
    if (!reachable.has(path)) {
      orphans.push(path)
    }
  }

  return orphans
}

function detectCycles(nodes: Map<string, DepNode>): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const stack: string[] = []

  function dfs(path: string) {
    if (inStack.has(path)) {
      // Found a cycle
      const cycleStart = stack.indexOf(path)
      cycles.push([...stack.slice(cycleStart), path])
      return
    }
    if (visited.has(path)) return

    visited.add(path)
    inStack.add(path)
    stack.push(path)

    const node = nodes.get(path)
    if (node) {
      for (const edge of node.forwardLinks) {
        if (edge.rel === 'REQUIRES') {
          dfs(edge.target)
        }
      }
    }

    stack.pop()
    inStack.delete(path)
  }

  for (const [path] of nodes) {
    dfs(path)
  }

  return cycles
}
