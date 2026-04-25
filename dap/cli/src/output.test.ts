import { describe, test, expect } from 'bun:test'
import { formatTrace, formatNode, formatDelegationGraph } from './output'
import { buildDapGraph } from './tree-builder'
import { join } from 'path'

const DAP_ROOT = join(import.meta.dir, '..', '..')

describe('output', () => {
  test('formatTrace renders ASCII tree for choose-document-type', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('choose-document-type')!
    const output = formatTrace(tree)

    expect(output).toContain('choose-document-type')
    expect(output).toContain('[?] identify-reader-question')
    expect(output).toContain('[>] classify-type')
    expect(output).toContain('[?] recommend-tutorial')
    expect(output).toContain('[!] apply-tutorial')
  })

  test('formatTrace shows gate nodes', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('sync-stale-docs')!
    const output = formatTrace(tree)

    expect(output).toContain('sync-stale-docs')
    expect(output).toContain('(gate)')
  })

  test('formatTrace shows delegation in generate-doc-set', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('generate-doc-set')!
    const output = formatTrace(tree)

    expect(output).toContain('[@] delegate-fix')
    expect(output).toContain('dap://validate-and-fix.md')
  })

  test('formatNode renders gate node with options', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('choose-document-type')!
    const node = tree.nodes.get('recommend-tutorial')!
    const output = formatNode(node, 'choose-document-type')

    expect(output).toContain('## recommend-tutorial [?]')
    expect(output).toContain('**method**: gate')
    expect(output).toContain('**options**: confirm, reconsider')
    expect(output).toContain('**outputs**: confirmation')
  })

  test('formatNode renders tool_call observe', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const tree = graph.trees.get('validate-and-fix')!
    const node = tree.nodes.get('run-validation')!
    const output = formatNode(node, 'validate-and-fix')

    expect(output).toContain('**method**: tool_call')
    expect(output).toContain('**tool**: dep_validate')
  })

  test('formatDelegationGraph shows all real trees', () => {
    const graph = buildDapGraph(DAP_ROOT)
    const output = formatDelegationGraph(graph)

    expect(output).toContain('DAP Delegation Graph')
    expect(output).toContain('choose-document-type')
    expect(output).toContain('validate-and-fix')
    expect(output).toContain('sync-stale-docs')
    expect(output).toContain('generate-doc-set')
    expect(output).toContain('audit-existing-docs')
    expect(output).toContain('delegates to: validate-and-fix')
  })
})
