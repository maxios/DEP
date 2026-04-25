import { readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { parseTreeFile } from './parser'
import { loadDapspec } from './config'
import type { DapGraph, DapTree, DapNode, DapEdge, DapspecConfig, Lifecycle } from './types'

export function buildDapGraph(dapRoot: string): DapGraph {
  const config = loadDapspec(dapRoot)
  const treesRoot = join(dapRoot, config.project.trees_root)
  const mdFiles = findMarkdownFiles(treesRoot)

  // Also include dap-seed.md if it exists
  const seedPath = join(dapRoot, 'dap-seed.md')
  if (existsSync(seedPath)) mdFiles.push(seedPath)

  const trees = new Map<string, DapTree>()
  const delegations: DapEdge[] = []

  for (const filePath of mdFiles) {
    const parsed = parseTreeFile(filePath)
    if (!parsed) continue

    const relPath = relative(dapRoot, filePath)
    const nodeMap = new Map<string, DapNode>()
    for (const node of parsed.nodes) {
      nodeMap.set(node.id, node)
    }

    const tree: DapTree = {
      path: relPath,
      metadata: parsed.metadata,
      nodes: nodeMap,
      lifecycle: computeLifecycle(parsed.metadata.last_verified, config),
    }

    trees.set(parsed.metadata.id, tree)

    // Collect delegation edges
    for (const node of parsed.nodes) {
      if (node.type === 'delegate' && node.delegate_to) {
        const targetId = node.delegate_to.replace(/^dap:\/\//, '').replace(/\.md$/, '')
        delegations.push({
          source: parsed.metadata.id,
          target: targetId,
          tree: parsed.metadata.id,
        })
      }
    }
  }

  const orphanNodes = detectOrphanNodes(trees)
  const cycles = detectDelegationCycles(trees, delegations)

  return { trees, delegations, orphanNodes, cycles }
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const fullPath = join(d, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (entry.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  }

  walk(dir)
  return files
}

function computeLifecycle(lastVerified: string, config: DapspecConfig): Lifecycle {
  const verified = new Date(lastVerified)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24))
  const cadence = config.governance.review_cadence

  if (daysSince <= cadence) return 'FRESH'
  if (daysSince <= cadence * 2) return 'AGING'
  return 'STALE'
}

/**
 * Detect nodes within each tree that are not reachable from entry_node.
 */
export function detectOrphanNodes(trees: Map<string, DapTree>): Array<{ tree: string; node: string }> {
  const orphans: Array<{ tree: string; node: string }> = []

  for (const [treeId, tree] of trees) {
    const reachable = new Set<string>()
    const queue: string[] = [tree.metadata.entry_node]
    reachable.add(tree.metadata.entry_node)

    while (queue.length > 0) {
      const current = queue.shift()!
      const node = tree.nodes.get(current)
      if (!node) continue

      const targets = getNodeTargets(node)
      for (const target of targets) {
        if (!reachable.has(target) && tree.nodes.has(target)) {
          reachable.add(target)
          queue.push(target)
        }
      }
    }

    for (const [nodeId] of tree.nodes) {
      if (!reachable.has(nodeId)) {
        orphans.push({ tree: treeId, node: nodeId })
      }
    }
  }

  return orphans
}

/**
 * Get all target node IDs from a node (next, conditions, on_success, on_failure, on_return).
 */
export function getNodeTargets(node: DapNode): string[] {
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

  return targets
}

/**
 * Detect cycles in the delegation graph between trees.
 */
function detectDelegationCycles(
  trees: Map<string, DapTree>,
  delegations: DapEdge[]
): string[][] {
  const cycles: string[][] = []
  const adjList = new Map<string, string[]>()

  for (const edge of delegations) {
    if (!adjList.has(edge.source)) adjList.set(edge.source, [])
    adjList.get(edge.source)!.push(edge.target)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()
  const stack: string[] = []

  function dfs(node: string) {
    if (inStack.has(node)) {
      const cycleStart = stack.indexOf(node)
      cycles.push([...stack.slice(cycleStart), node])
      return
    }
    if (visited.has(node)) return

    visited.add(node)
    inStack.add(node)
    stack.push(node)

    const neighbors = adjList.get(node) ?? []
    for (const neighbor of neighbors) {
      dfs(neighbor)
    }

    stack.pop()
    inStack.delete(node)
  }

  for (const [treeId] of trees) {
    dfs(treeId)
  }

  return cycles
}

/**
 * Detect cycles within a single tree's node graph.
 */
export function detectNodeCycles(tree: DapTree): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const stack: string[] = []

  function dfs(nodeId: string) {
    if (inStack.has(nodeId)) {
      const cycleStart = stack.indexOf(nodeId)
      cycles.push([...stack.slice(cycleStart), nodeId])
      return
    }
    if (visited.has(nodeId)) return

    visited.add(nodeId)
    inStack.add(nodeId)
    stack.push(nodeId)

    const node = tree.nodes.get(nodeId)
    if (node) {
      const targets = getNodeTargets(node)
      for (const target of targets) {
        dfs(target)
      }
    }

    stack.pop()
    inStack.delete(nodeId)
  }

  for (const [nodeId] of tree.nodes) {
    dfs(nodeId)
  }

  return cycles
}
