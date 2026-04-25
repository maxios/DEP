import { describe, test, expect } from 'bun:test'
import { formatTrace, formatNode, formatDelegationGraph } from './output'
import { buildDapGraph } from './tree-builder'
import { join } from 'path'

const DAP_ROOT = join(import.meta.dir, '..', '..')

describe('output', () => {
  test('formatTrace renders ASCII tree', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('simple-routing')!
    const output = formatTrace(tree)

    expect(output).toContain('simple-routing')
    expect(output).toContain('[?] check-urgency')
    expect(output).toContain('[>] route-request')
    expect(output).toContain('[!] handle-urgent')
    expect(output).toContain('[!] handle-normal')
    expect(output).toContain('_otherwise')
  })

  test('formatTrace shows delegation nodes', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('deploy-to-prod')!
    const output = formatTrace(tree)

    expect(output).toContain('[@] trigger-rollback')
    expect(output).toContain('dap://rollback-procedure.md')
  })

  test('formatNode renders single node', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('simple-routing')!
    const node = tree.nodes.get('check-urgency')!
    const output = formatNode(node, 'simple-routing')

    expect(output).toContain('## check-urgency [?]')
    expect(output).toContain('**method**: prompt')
    expect(output).toContain('**outputs**: urgency')
    expect(output).toContain('**next**: route-request')
  })

  test('formatDelegationGraph shows all trees', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const output = formatDelegationGraph(graph)

    expect(output).toContain('DAP Delegation Graph')
    expect(output).toContain('deploy-to-prod')
    expect(output).toContain('triage-issue')
    expect(output).toContain('simple-routing')
    expect(output).toContain('delegates to: rollback-procedure')
  })
})
