import { describe, test, expect } from 'bun:test'
import { buildDapGraph, detectNodeCycles, detectOrphanNodes } from './tree-builder'
import { join } from 'path'

const DAP_ROOT = join(import.meta.dir, '..', '..')

describe('tree-builder', () => {
  test('builds graph from all tree files', () => {
    const graph = buildDapGraph(DAP_ROOT)
    expect(graph.trees.size).toBeGreaterThanOrEqual(5)
    expect(graph.trees.has('choose-document-type')).toBe(true)
    expect(graph.trees.has('validate-and-fix')).toBe(true)
    expect(graph.trees.has('sync-stale-docs')).toBe(true)
    expect(graph.trees.has('generate-doc-set')).toBe(true)
    expect(graph.trees.has('audit-existing-docs')).toBe(true)
  })

  test('computes lifecycle state', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('choose-document-type')!
    expect(tree.lifecycle).toBe('FRESH')
  })

  test('detects delegations', () => {
    const graph = buildDapGraph(DAP_ROOT)
    // generate-doc-set delegates to validate-and-fix
    const genDelegation = graph.delegations.find((d) => d.source === 'generate-doc-set')
    expect(genDelegation).toBeDefined()
    expect(genDelegation!.target).toBe('validate-and-fix')

    // audit-existing-docs also delegates to validate-and-fix
    const auditDelegation = graph.delegations.find((d) => d.source === 'audit-existing-docs')
    expect(auditDelegation).toBeDefined()
    expect(auditDelegation!.target).toBe('validate-and-fix')
  })

  test('no orphan nodes in real trees', () => {
    const graph = buildDapGraph(DAP_ROOT)
    for (const [id, tree] of graph.trees) {
      if (id === 'dap-seed') continue // seed has minimal nodes
      const orphans = detectOrphanNodes(new Map([[id, tree]]))
      expect(orphans.length).toBe(0)
    }
  })

  test('node cycles are only intentional retry/revision loops', () => {
    const graph = buildDapGraph(DAP_ROOT)
    // Real trees have intentional revision loops (e.g., "fix then re-validate",
    // "revise then re-approve"). These pass through decide nodes with exit branches.
    // Only the seed doc should have zero cycles.
    const seed = graph.trees.get('dap-seed')!
    expect(detectNodeCycles(seed).length).toBe(0)

    // All other trees may have intentional loops through gate/decide nodes
    for (const [id, tree] of graph.trees) {
      if (id === 'dap-seed') continue
      const cycles = detectNodeCycles(tree)
      // Every cycle must pass through at least one decide node (has exit branches)
      for (const cycle of cycles) {
        const hasDecideNode = cycle.some((nodeId) => {
          const node = tree.nodes.get(nodeId)
          return node?.type === 'decide'
        })
        expect(hasDecideNode).toBe(true)
      }
    }
  })

  test('no delegation cycles', () => {
    const graph = buildDapGraph(DAP_ROOT)
    expect(graph.cycles.length).toBe(0)
  })

  test('nodes indexed correctly', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('choose-document-type')!
    expect(tree.nodes.has('identify-reader-question')).toBe(true)
    expect(tree.nodes.has('classify-type')).toBe(true)
    expect(tree.nodes.has('apply-tutorial')).toBe(true)
  })
})
