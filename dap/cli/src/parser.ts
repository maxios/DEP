import { readFileSync } from 'fs'
import matter from 'gray-matter'
import type { DapMetadata, DapNode, NodeType, DecideCondition } from './types'

export interface ParsedTree {
  path: string
  metadata: DapMetadata
  nodes: DapNode[]
  rawContent: string
}

const SYMBOL_TO_TYPE: Record<string, NodeType> = {
  '[?]': 'observe',
  '[>]': 'decide',
  '[!]': 'act',
  '[@]': 'delegate',
}

export function parseTreeFile(filePath: string): ParsedTree | null {
  const content = readFileSync(filePath, 'utf-8')
  const { data, content: body } = matter(content)

  if (!data.dap) return null

  const metadata = data.dap as DapMetadata
  const nodes = parseNodes(body)

  return {
    path: filePath,
    metadata,
    nodes,
    rawContent: body,
  }
}

function parseNodes(body: string): DapNode[] {
  const nodes: DapNode[] = []

  // Build a set of character positions that are inside code blocks
  const codeBlockRanges: Array<[number, number]> = []
  const codeBlockRegex = /^```[\s\S]*?^```/gm
  let cbMatch: RegExpExecArray | null
  while ((cbMatch = codeBlockRegex.exec(body)) !== null) {
    codeBlockRanges.push([cbMatch.index, cbMatch.index + cbMatch[0].length])
  }

  function isInsideCodeBlock(pos: number): boolean {
    return codeBlockRanges.some(([start, end]) => pos >= start && pos <= end)
  }

  // Match H2 headings with node-id [symbol] pattern
  const nodeRegex = /^##\s+(\S+)\s+(\[\?\]|\[>\]|\[!]|\[@])\s*$/gm
  const matches: Array<{ id: string; symbol: string; index: number }> = []

  let match: RegExpExecArray | null
  while ((match = nodeRegex.exec(body)) !== null) {
    if (isInsideCodeBlock(match.index)) continue
    matches.push({
      id: match[1]!,
      symbol: match[2]!,
      index: match.index,
    })
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!
    const nextIndex = i + 1 < matches.length ? matches[i + 1]!.index : body.length
    const sectionContent = body.slice(m.index, nextIndex)
    const type = SYMBOL_TO_TYPE[m.symbol]
    if (!type) continue

    const node = parseNodeSection(m.id, type, sectionContent)
    nodes.push(node)
  }

  return nodes
}

function parseNodeSection(id: string, type: NodeType, section: string): DapNode {
  const lines = section.split('\n')
  // First non-heading, non-empty line(s) before the first list item or table = description
  const description = extractDescription(lines)
  const props = extractProperties(lines)
  const conditions = type === 'decide' ? extractConditionTable(lines) : undefined

  const node: DapNode = {
    id,
    type,
    description,
  }

  // Map parsed properties to node fields based on type
  if (type === 'observe') {
    if (props.method) node.method = props.method as DapNode['method']
    if (props.tool) node.tool = props.tool
    if (props.args) node.args = parseJsonValue(props.args)
    if (props.prompt) node.prompt = props.prompt
    if (props.expr) node.expr = props.expr
    if (props.outputs) node.outputs = props.outputs.split(',').map((s) => s.trim())
    if (props.next) node.next = props.next
  } else if (type === 'decide') {
    node.conditions = conditions
  } else if (type === 'act') {
    if (props.action_type) node.action_type = props.action_type as DapNode['action_type']
    if (props.tool) node.tool = props.tool
    if (props.args) node.args = parseJsonValue(props.args)
    if (props.ref) node.ref = props.ref
    if (props.intent) node.intent = props.intent
    if (props.params) node.params = parseJsonValue(props.params)
    if (props.summary) node.summary = props.summary
    if (props.on_success) node.on_success = props.on_success
    if (props.on_failure) node.on_failure = props.on_failure
    if (props.terminal) node.terminal = props.terminal === 'true'
  } else if (type === 'delegate') {
    if (props.delegate_to) node.delegate_to = props.delegate_to
    if (props.pass_context) node.pass_context = parseJsonValue(props.pass_context)
    if (props.on_return) node.on_return = props.on_return
    if (props.terminal) node.terminal = props.terminal === 'true'
  }

  return node
}

function extractDescription(lines: string[]): string {
  const descLines: string[] = []
  let started = false

  for (const line of lines) {
    // Skip the heading
    if (line.match(/^##\s+/)) {
      started = true
      continue
    }
    if (!started) continue
    // Stop at first list item or table
    if (line.match(/^-\s+\*\*/) || line.match(/^\|/)) break
    if (line.trim()) descLines.push(line.trim())
  }

  return descLines.join(' ').trim()
}

function extractProperties(lines: string[]): Record<string, string> {
  const props: Record<string, string> = {}

  for (const line of lines) {
    // Match: - **key**: value
    const match = line.match(/^-\s+\*\*(\w+)\*\*:\s*(.+)$/)
    if (match) {
      // Strip trailing markdown comments (# ...) that aren't part of the value
      let value = match[2]!.trim()
      // Only strip if it looks like a comment after actual content (not inside JSON)
      if (!value.startsWith('{') && !value.startsWith('[')) {
        value = value.replace(/\s+#\s+.*$/, '')
      }
      props[match[1]!] = value
    }
  }

  return props
}

function extractConditionTable(lines: string[]): DecideCondition[] {
  const conditions: DecideCondition[] = []
  let inTable = false

  for (const line of lines) {
    const trimmed = line.trim()
    // Detect table start
    if (trimmed.startsWith('|') && trimmed.includes('condition') && trimmed.includes('next')) {
      inTable = true
      continue
    }
    // Skip separator row
    if (inTable && trimmed.match(/^\|[\s-|]+\|$/)) continue
    // Parse table rows
    if (inTable && trimmed.startsWith('|')) {
      const cells = trimmed
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
      if (cells.length >= 2) {
        conditions.push({
          condition: cells[0]!.replace(/^`|`$/g, ''),
          next: cells[1]!,
        })
      }
    } else if (inTable && !trimmed.startsWith('|')) {
      break
    }
  }

  return conditions
}

function parseJsonValue(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    // Return as-is wrapped in an object if not valid JSON
    return { _raw: value }
  }
}
