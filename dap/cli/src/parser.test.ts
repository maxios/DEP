import { describe, test, expect } from 'bun:test'
import { parseTreeFile } from './parser'
import { join } from 'path'

const DAP_ROOT = join(import.meta.dir, '..', '..')

describe('parser', () => {
  test('parses simple-routing tree', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'simple-routing.md'))
    expect(result).not.toBeNull()
    expect(result!.metadata.id).toBe('simple-routing')
    expect(result!.metadata.entry_node).toBe('check-urgency')
    expect(result!.nodes.length).toBe(4)
  })

  test('parses node types correctly', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'simple-routing.md'))!
    const types = result.nodes.map((n) => ({ id: n.id, type: n.type }))
    expect(types).toContainEqual({ id: 'check-urgency', type: 'observe' })
    expect(types).toContainEqual({ id: 'route-request', type: 'decide' })
    expect(types).toContainEqual({ id: 'handle-urgent', type: 'act' })
    expect(types).toContainEqual({ id: 'handle-normal', type: 'act' })
  })

  test('parses observe node fields', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'simple-routing.md'))!
    const observe = result.nodes.find((n) => n.id === 'check-urgency')!
    expect(observe.method).toBe('prompt')
    expect(observe.outputs).toEqual(['urgency'])
    expect(observe.next).toBe('route-request')
  })

  test('parses decide node conditions', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'simple-routing.md'))!
    const decide = result.nodes.find((n) => n.id === 'route-request')!
    expect(decide.conditions).toHaveLength(2)
    expect(decide.conditions![0]!.condition).toBe('urgency == "urgent"')
    expect(decide.conditions![0]!.next).toBe('handle-urgent')
    expect(decide.conditions![1]!.condition).toBe('_otherwise')
  })

  test('parses act node fields', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'simple-routing.md'))!
    const act = result.nodes.find((n) => n.id === 'handle-urgent')!
    expect(act.action_type).toBe('intent')
    expect(act.intent).toBe('notify')
    expect(act.terminal).toBe(true)
  })

  test('parses delegate node', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'deploy-to-prod.md'))!
    const delegate = result.nodes.find((n) => n.id === 'trigger-rollback')!
    expect(delegate.type).toBe('delegate')
    expect(delegate.delegate_to).toBe('dap://rollback-procedure.md')
    expect(delegate.terminal).toBe(true)
  })

  test('parses complex tree with all node types', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'deploy-to-prod.md'))!
    expect(result.metadata.id).toBe('deploy-to-prod')
    expect(result.nodes.length).toBe(10)

    const types = new Set(result.nodes.map((n) => n.type))
    expect(types).toContain('observe')
    expect(types).toContain('decide')
    expect(types).toContain('act')
    expect(types).toContain('delegate')
  })

  test('skips nodes inside code blocks in seed doc', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'dap-seed.md'))!
    // Should only have the 2 actual nodes at the bottom, not example nodes in code blocks
    expect(result.nodes.length).toBe(2)
    expect(result.nodes.map((n) => n.id)).toEqual(['understand-dap', 'ready-to-act'])
  })

  test('returns null for non-DAP files', () => {
    const result = parseTreeFile(join(DAP_ROOT, '..', 'seed.md'))
    expect(result).toBeNull()
  })

  test('parses document action ref', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'triage-issue.md'))!
    const docAction = result.nodes.find((n) => n.id === 'lookup-known-fix')!
    expect(docAction.action_type).toBe('document')
    expect(docAction.ref).toBe('dep://docs/reference/error-codes.md')
  })
})
