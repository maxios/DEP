import { describe, test, expect } from 'bun:test'
import { buildDapGraph, detectNodeCycles, detectOrphanNodes } from './tree-builder'
import { join } from 'path'
import type { DapTree, DapNode } from './types'

const DAP_ROOT = join(import.meta.dir, '..', '..')

describe('tree-builder', () => {
  test('builds graph from all tree files', () => {
    const graph = buildDapGraph(DAP_ROOT)
    expect(graph.trees.size).toBeGreaterThanOrEqual(3)
    expect(graph.trees.has('simple-routing')).toBe(true)
    expect(graph.trees.has('deploy-to-prod')).toBe(true)
    expect(graph.trees.has('triage-issue')).toBe(true)
  })

  test('computes lifecycle state', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('simple-routing')!
    // Recently created, should be FRESH
    expect(tree.lifecycle).toBe('FRESH')
  })

  test('detects delegations', () => {
    const graph = buildDapGraph(DAP_ROOT)
    expect(graph.delegations.length).toBeGreaterThanOrEqual(1)
    const deployDelegation = graph.delegations.find((d) => d.source === 'deploy-to-prod')
    expect(deployDelegation).toBeDefined()
    expect(deployDelegation!.target).toBe('rollback-procedure')
  })

  test('no orphan nodes in valid trees', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('simple-routing')!
    const orphans = detectOrphanNodes(new Map([['simple-routing', tree]]))
    expect(orphans.length).toBe(0)
  })

  test('no node cycles in valid trees', () => {
    const graph = buildDapGraph(DAP_ROOT)
    for (const [id, tree] of graph.trees) {
      const cycles = detectNodeCycles(tree)
      expect(cycles.length).toBe(0)
    }
  })

  test('no delegation cycles', () => {
    const graph = buildDapGraph(DAP_ROOT)
    expect(graph.cycles.length).toBe(0)
  })

  test('nodes are properly indexed by id', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('simple-routing')!
    expect(tree.nodes.has('check-urgency')).toBe(true)
    expect(tree.nodes.has('route-request')).toBe(true)
    expect(tree.nodes.has('handle-urgent')).toBe(true)
    expect(tree.nodes.has('handle-normal')).toBe(true)
  })
})
