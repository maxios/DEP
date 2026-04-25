import { buildDapGraph, detectNodeCycles, getNodeTargets } from '../tree-builder'
import { loadDapspec } from '../config'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import type { DapTree, DapNode, DapGraph, DapspecConfig } from '../types'

interface ValidationResult {
  tree: string
  status: 'PASS' | 'WARN' | 'FAIL'
  checks: Array<{ name: string; passed: boolean; message?: string }>
}

export function validateCommand(dapRoot: string, flags: { json?: boolean }) {
  const config = loadDapspec(dapRoot)
  const graph = buildDapGraph(dapRoot)

  const results: ValidationResult[] = []

  for (const [id, tree] of graph.trees) {
    const result = validateTree(tree, id, config, dapRoot)
    results.push(result)
  }

  const graphChecks = validateGraphLevel(graph, config)

  if (flags.json) {
    console.log(JSON.stringify({ trees: results, graph: graphChecks }, null, 2))
  } else {
    printReport(results, graphChecks, graph)
  }

  const hasFail = results.some((r) => r.status === 'FAIL') || graphChecks.some((c) => !c.passed)
  process.exit(hasFail ? 1 : 0)
}

function validateTree(
  tree: DapTree,
  treeId: string,
  config: DapspecConfig,
  dapRoot: string
): ValidationResult {
  const checks: ValidationResult['checks'] = []
  const meta = tree.metadata

  // 1. Frontmatter complete
  const requiredFields = ['id', 'version', 'trigger', 'audience', 'owner', 'created', 'last_verified', 'confidence', 'entry_node']
  const missing = requiredFields.filter((f) => !(f in meta) || (meta as Record<string, unknown>)[f] === undefined)
  checks.push({
    name: 'Frontmatter complete',
    passed: missing.length === 0,
    message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
  })

  // 2. Entry node exists
  const entryExists = tree.nodes.has(meta.entry_node)
  checks.push({
    name: 'Entry node exists',
    passed: entryExists,
    message: !entryExists ? `Entry node "${meta.entry_node}" not found in tree` : undefined,
  })

  // 3. All nodes reachable + 4. No orphans
  const reachable = new Set<string>()
  if (entryExists) {
    const queue = [meta.entry_node]
    reachable.add(meta.entry_node)
    while (queue.length > 0) {
      const current = queue.shift()!
      const node = tree.nodes.get(current)
      if (!node) continue
      for (const target of getNodeTargets(node)) {
        if (!reachable.has(target) && tree.nodes.has(target)) {
          reachable.add(target)
          queue.push(target)
        }
      }
    }
  }

  const unreachableNodes = [...tree.nodes.keys()].filter((id) => !reachable.has(id))
  checks.push({
    name: 'All nodes reachable',
    passed: unreachableNodes.length === 0,
    message: unreachableNodes.length > 0 ? `Orphan nodes: ${unreachableNodes.join(', ')}` : undefined,
  })

  // 5. Acyclicity — allow revision loops (cycles through decide nodes with exit branches)
  const nodeCycles = detectNodeCycles(tree)
  const trueCycles = nodeCycles.filter((cycle) => {
    // A cycle is a "revision loop" (allowed) if it passes through a decide node
    // that has at least one exit branch not in the cycle
    return !cycle.some((nodeId) => {
      const node = tree.nodes.get(nodeId)
      if (node?.type !== 'decide' || !node.conditions) return false
      const cycleSet = new Set(cycle)
      return node.conditions.some((c) => !cycleSet.has(c.next))
    })
  })
  const revisionLoops = nodeCycles.length - trueCycles.length
  checks.push({
    name: 'Acyclicity (DAG)',
    passed: trueCycles.length === 0,
    message: trueCycles.length > 0
      ? `True cycles: ${trueCycles.map((c) => c.join(' -> ')).join('; ')}`
      : revisionLoops > 0
        ? `${revisionLoops} revision loop(s) detected (allowed: all pass through decide nodes with exit branches)`
        : undefined,
  })

  // 6. Terminal coverage
  const terminalCheck = checkTerminalCoverage(tree)
  checks.push({
    name: 'Terminal coverage',
    passed: terminalCheck.passed,
    message: terminalCheck.message,
  })

  // 7. Type correctness
  for (const [nodeId, node] of tree.nodes) {
    const typeCheck = checkNodeTypeCorrectness(node, nodeId)
    if (!typeCheck.passed) {
      checks.push(typeCheck)
    }
  }

  // 8. Otherwise clause on decide nodes
  for (const [nodeId, node] of tree.nodes) {
    if (node.type === 'decide') {
      const hasOtherwise = node.conditions && node.conditions.length > 0 &&
        node.conditions[node.conditions.length - 1]!.condition === '_otherwise'
      checks.push({
        name: `Otherwise clause: ${nodeId}`,
        passed: !!hasOtherwise,
        message: !hasOtherwise ? `Decide node "${nodeId}" missing _otherwise condition` : undefined,
      })
    }
  }

  // 9. DEP URI resolution (if DEP integration enabled)
  if (config.dep_integration?.resolve_dep_refs) {
    const depDocspecPath = config.dep_integration.docspec_path
    if (depDocspecPath) {
      const depRoot = resolve(dapRoot, depDocspecPath, '..')
      for (const [nodeId, node] of tree.nodes) {
        if (node.ref && node.ref.startsWith('dep://')) {
          const depPath = node.ref.replace('dep://', '')
          const fullPath = join(depRoot, depPath)
          const exists = existsSync(fullPath)
          if (!exists) {
            checks.push({
              name: `DEP ref: ${nodeId}`,
              passed: false,
              message: `${node.ref} not found at ${fullPath}`,
            })
          }
        }
      }
    }
  }

  // Lifecycle check (warning only)
  checks.push({
    name: `Lifecycle: ${tree.lifecycle}`,
    passed: tree.lifecycle !== 'STALE',
    message: tree.lifecycle === 'STALE' ? 'Tree exceeds review cadence' : undefined,
  })

  // Confidence
  checks.push({
    name: 'Confidence valid',
    passed: ['high', 'medium', 'low', 'stale'].includes(meta.confidence),
    message: !['high', 'medium', 'low', 'stale'].includes(meta.confidence) ? `Invalid: ${meta.confidence}` : undefined,
  })

  const warnOnlyPrefixes = ['Lifecycle', 'DEP ref']
  const isWarnOnly = (name: string) => warnOnlyPrefixes.some((p) => name.startsWith(p))

  const status = checks.some((c) => !c.passed && !isWarnOnly(c.name))
    ? 'FAIL'
    : checks.some((c) => !c.passed)
      ? 'WARN'
      : 'PASS'

  return { tree: treeId, status, checks }
}

function checkTerminalCoverage(tree: DapTree): { passed: boolean; message?: string } {
  // BFS from entry node, check that all leaf paths reach a terminal or delegate
  const visited = new Set<string>()
  const deadEnds: string[] = []

  function dfs(nodeId: string, path: string[]) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = tree.nodes.get(nodeId)
    if (!node) {
      deadEnds.push(`${path.join(' -> ')} -> ${nodeId} (missing node)`)
      return
    }

    const targets = getNodeTargets(node)

    // A node is a valid terminal if it's marked terminal or is a terminal delegate
    if (node.terminal || (node.type === 'delegate' && !node.on_return)) return

    if (targets.length === 0 && !node.terminal) {
      deadEnds.push(nodeId)
      return
    }

    for (const target of targets) {
      if (!visited.has(target)) {
        dfs(target, [...path, nodeId])
      }
    }
  }

  dfs(tree.metadata.entry_node, [])

  return {
    passed: deadEnds.length === 0,
    message: deadEnds.length > 0 ? `Dead ends: ${deadEnds.join(', ')}` : undefined,
  }
}

function checkNodeTypeCorrectness(node: DapNode, nodeId: string): { name: string; passed: boolean; message?: string } {
  switch (node.type) {
    case 'observe':
      if (!node.method) return { name: `Type check: ${nodeId}`, passed: false, message: `Observe node missing "method"` }
      if (!node.outputs) return { name: `Type check: ${nodeId}`, passed: false, message: `Observe node missing "outputs"` }
      break
    case 'decide':
      if (!node.conditions || node.conditions.length === 0)
        return { name: `Type check: ${nodeId}`, passed: false, message: `Decide node missing condition table` }
      break
    case 'act':
      if (!node.action_type) return { name: `Type check: ${nodeId}`, passed: false, message: `Act node missing "action_type"` }
      break
    case 'delegate':
      if (!node.delegate_to) return { name: `Type check: ${nodeId}`, passed: false, message: `Delegate node missing "delegate_to"` }
      break
  }
  return { name: `Type check: ${nodeId}`, passed: true }
}

function validateGraphLevel(
  graph: DapGraph,
  config: DapspecConfig
): Array<{ name: string; passed: boolean; message?: string }> {
  const checks: Array<{ name: string; passed: boolean; message?: string }> = []

  // 12. No delegation cycles
  checks.push({
    name: 'No delegation cycles',
    passed: graph.cycles.length === 0,
    message: graph.cycles.length > 0
      ? `Cycles: ${graph.cycles.map((c) => c.join(' -> ')).join('; ')}`
      : undefined,
  })

  // 13. Trigger uniqueness
  const triggers = new Map<string, string[]>()
  for (const [id, tree] of graph.trees) {
    const key = tree.metadata.trigger.toLowerCase().trim()
    if (!triggers.has(key)) triggers.set(key, [])
    triggers.get(key)!.push(id)
  }
  const duplicates = [...triggers.entries()].filter(([, ids]) => ids.length > 1)
  checks.push({
    name: 'Trigger uniqueness',
    passed: duplicates.length === 0,
    message: duplicates.length > 0
      ? `Duplicate triggers: ${duplicates.map(([t, ids]) => `"${t}" -> [${ids.join(', ')}]`).join('; ')}`
      : undefined,
  })

  return checks
}

function printReport(
  results: ValidationResult[],
  graphChecks: Array<{ name: string; passed: boolean; message?: string }>,
  graph: DapGraph
) {
  const passed = results.filter((r) => r.status === 'PASS').length
  const warned = results.filter((r) => r.status === 'WARN').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log('## DAP Validation Report\n')
  console.log(`Trees: ${results.length} | Pass: ${passed} | Warn: ${warned} | Fail: ${failed}\n`)

  for (const result of results) {
    const icon = result.status === 'PASS' ? '\u2713' : result.status === 'WARN' ? '\u25D0' : '\u2717'
    console.log(`${icon} ${result.tree} \u2014 ${result.status}`)
    for (const check of result.checks) {
      if (!check.passed) {
        console.log(`    \u2717 ${check.name}${check.message ? ': ' + check.message : ''}`)
      }
    }
  }

  console.log('\n### Graph Integrity\n')
  for (const check of graphChecks) {
    const icon = check.passed ? '\u2713' : '\u2717'
    console.log(`${icon} ${check.name}${check.message ? ': ' + check.message : ''}`)
  }
}
