import { describe, test, expect } from 'bun:test'
import { parseTreeFile } from './parser'
import { join } from 'path'

const DAP_ROOT = join(import.meta.dir, '..', '..', '..', 'dap')

describe('parser', () => {
  test('parses choose-document-type tree', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'choose-document-type.md'))
    expect(result).not.toBeNull()
    expect(result!.metadata.id).toBe('choose-document-type')
    expect(result!.metadata.entry_node).toBe('identify-reader-question')
    expect(result!.nodes.length).toBeGreaterThan(5)
  })

  test('parses node types correctly', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'choose-document-type.md'))!
    const observe = result.nodes.find((n) => n.id === 'identify-reader-question')
    expect(observe).toBeDefined()
    expect(observe!.type).toBe('observe')

    const decide = result.nodes.find((n) => n.id === 'classify-type')
    expect(decide).toBeDefined()
    expect(decide!.type).toBe('decide')

    const act = result.nodes.find((n) => n.id === 'apply-tutorial')
    expect(act).toBeDefined()
    expect(act!.type).toBe('act')
  })

  test('parses gate method with options', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'choose-document-type.md'))!
    const gate = result.nodes.find((n) => n.id === 'recommend-tutorial')!
    expect(gate.type).toBe('observe')
    expect(gate.method).toBe('gate')
    expect(gate.options).toEqual(['confirm', 'reconsider'])
    expect(gate.outputs).toEqual(['confirmation'])
  })

  test('parses observe node fields', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'choose-document-type.md'))!
    const observe = result.nodes.find((n) => n.id === 'identify-reader-question')!
    expect(observe.method).toBe('prompt')
    expect(observe.outputs).toContain('reader_intent')
    expect(observe.next).toBe('classify-type')
  })

  test('parses decide node conditions', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'choose-document-type.md'))!
    const decide = result.nodes.find((n) => n.id === 'classify-type')!
    expect(decide.conditions!.length).toBeGreaterThanOrEqual(5)
    expect(decide.conditions!.some((c) => c.condition === '_otherwise')).toBe(true)
  })

  test('parses act node with document ref', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'choose-document-type.md'))!
    const act = result.nodes.find((n) => n.id === 'apply-tutorial')!
    expect(act.action_type).toBe('document')
    expect(act.ref).toBe('dep://docs/reference/type-signature-tutorial.md')
    expect(act.terminal).toBe(true)
  })

  test('parses validate-and-fix tree', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'validate-and-fix.md'))!
    expect(result.metadata.id).toBe('validate-and-fix')
    expect(result.nodes.length).toBeGreaterThan(5)

    // Has tool_call observe
    const toolCall = result.nodes.find((n) => n.id === 'run-validation')!
    expect(toolCall.method).toBe('tool_call')
    expect(toolCall.tool).toBe('dep_validate')
  })

  test('parses delegate node in generate-doc-set', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'generate-doc-set.md'))!
    const delegate = result.nodes.find((n) => n.id === 'delegate-fix')!
    expect(delegate.type).toBe('delegate')
    expect(delegate.delegate_to).toBe('dap://validate-and-fix.md')
  })

  test('parses sync-stale-docs with gate nodes', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'sync-stale-docs.md'))!
    const gates = result.nodes.filter((n) => n.method === 'gate')
    expect(gates.length).toBeGreaterThanOrEqual(3)
  })

  test('parses audit-existing-docs tree', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'trees', 'audit-existing-docs.md'))!
    expect(result.metadata.id).toBe('audit-existing-docs')
    expect(result.metadata.audience).toContain('project-lead')
  })

  test('skips nodes inside code blocks in seed doc', () => {
    const result = parseTreeFile(join(DAP_ROOT, 'dap-seed.md'))!
    expect(result.nodes.length).toBe(2)
    expect(result.nodes.map((n) => n.id)).toEqual(['understand-dap', 'ready-to-act'])
  })

  test('returns null for non-DAP files', () => {
    const result = parseTreeFile(join(DAP_ROOT, '..', 'seed.md'))
    expect(result).toBeNull()
  })
})
