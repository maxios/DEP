import type { DapTree, DapNode, DapGraph, Lifecycle } from './types'
import { NODE_TYPE_SYMBOLS } from './types'
import { getNodeTargets } from './tree-builder'

export function lifecycleIcon(state: Lifecycle): string {
  switch (state) {
    case 'FRESH': return '\u25CF'
    case 'AGING': return '\u25D0'
    case 'STALE': return '\u25CB'
  }
}

/**
 * Render a single node for the `dap node` command.
 */
export function formatNode(node: DapNode, treeId: string): string {
  const symbol = NODE_TYPE_SYMBOLS[node.type]
  const lines: string[] = [`## ${node.id} ${symbol}`, '']

  if (node.description) lines.push(node.description, '')

  if (node.type === 'observe') {
    if (node.method) lines.push(`- **method**: ${node.method}`)
    if (node.tool) lines.push(`- **tool**: ${node.tool}`)
    if (node.args) lines.push(`- **args**: ${JSON.stringify(node.args)}`)
    if (node.prompt) lines.push(`- **prompt**: ${node.prompt}`)
    if (node.expr) lines.push(`- **expr**: ${node.expr}`)
    if (node.options) lines.push(`- **options**: ${node.options.join(', ')}`)
    if (node.outputs) lines.push(`- **outputs**: ${node.outputs.join(', ')}`)
    if (node.next) lines.push(`- **next**: ${node.next}`)
  } else if (node.type === 'decide') {
    if (node.conditions && node.conditions.length > 0) {
      lines.push('| condition | next |', '| --- | --- |')
      for (const cond of node.conditions) {
        lines.push(`| \`${cond.condition}\` | ${cond.next} |`)
      }
    }
  } else if (node.type === 'act') {
    if (node.action_type) lines.push(`- **action_type**: ${node.action_type}`)
    if (node.tool) lines.push(`- **tool**: ${node.tool}`)
    if (node.args) lines.push(`- **args**: ${JSON.stringify(node.args)}`)
    if (node.ref) lines.push(`- **ref**: ${node.ref}`)
    if (node.intent) lines.push(`- **intent**: ${node.intent}`)
    if (node.params) lines.push(`- **params**: ${JSON.stringify(node.params)}`)
    if (node.summary) lines.push(`- **summary**: ${node.summary}`)
    if (node.on_success) lines.push(`- **on_success**: ${node.on_success}`)
    if (node.on_failure) lines.push(`- **on_failure**: ${node.on_failure}`)
    if (node.terminal !== undefined) lines.push(`- **terminal**: ${node.terminal}`)
  } else if (node.type === 'delegate') {
    if (node.delegate_to) lines.push(`- **delegate_to**: ${node.delegate_to}`)
    if (node.pass_context) lines.push(`- **pass_context**: ${JSON.stringify(node.pass_context)}`)
    if (node.on_return) lines.push(`- **on_return**: ${node.on_return}`)
    if (node.terminal !== undefined) lines.push(`- **terminal**: ${node.terminal}`)
  }

  return lines.join('\n')
}

/**
 * Render ASCII tree visualization for `dap trace`.
 */
export function formatTrace(tree: DapTree): string {
  const lines: string[] = [tree.metadata.id]
  const visited = new Set<string>()

  function renderNode(nodeId: string, prefix: string, isLast: boolean) {
    const node = tree.nodes.get(nodeId)
    if (!node) {
      lines.push(`${prefix}${isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '}${nodeId} (missing)`)
      return
    }

    if (visited.has(nodeId)) {
      const symbol = NODE_TYPE_SYMBOLS[node.type]
      lines.push(`${prefix}${isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '}${symbol} ${nodeId} (cycle ref)`)
      return
    }

    visited.add(nodeId)
    const symbol = NODE_TYPE_SYMBOLS[node.type]
    const detail = getNodeDetail(node)
    const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '
    const line = detail ? `${symbol} ${nodeId} ${detail}` : `${symbol} ${nodeId}`
    lines.push(`${prefix}${connector}${line}`)

    const childPrefix = prefix + (isLast ? '    ' : '\u2502   ')

    if (node.type === 'decide' && node.conditions) {
      for (let i = 0; i < node.conditions.length; i++) {
        const cond = node.conditions[i]!
        const condIsLast = i === node.conditions.length - 1
        const condConnector = condIsLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '

        // Get target node detail for inline display
        const targetNode = tree.nodes.get(cond.next)
        if (targetNode && !visited.has(cond.next) && isLeafLike(targetNode)) {
          // Inline leaf nodes on the condition line
          const targetSymbol = NODE_TYPE_SYMBOLS[targetNode.type]
          const targetDetail = getNodeDetail(targetNode)
          const condLabel = cond.condition === '_otherwise' ? '_otherwise' : cond.condition
          lines.push(
            `${childPrefix}${condConnector}${condLabel} \u2500\u2500\u25B6 ${targetSymbol} ${cond.next}${targetDetail ? ' ' + targetDetail : ''}`
          )
          visited.add(cond.next)
        } else {
          const condLabel = cond.condition === '_otherwise' ? '_otherwise' : cond.condition
          lines.push(`${childPrefix}${condConnector}${condLabel}`)
          const nestedPrefix = childPrefix + (condIsLast ? '    ' : '\u2502   ')
          renderNode(cond.next, nestedPrefix, true)
        }
      }
    } else {
      // For non-decide nodes, render children
      const targets = getDirectChildren(node)
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i]!
        renderNode(target.id, childPrefix, i === targets.length - 1)
      }
    }
  }

  // Start from entry node
  const entryNode = tree.nodes.get(tree.metadata.entry_node)
  if (entryNode) {
    renderNode(tree.metadata.entry_node, '', true)
  } else {
    lines.push(`  (entry node "${tree.metadata.entry_node}" not found)`)
  }

  return lines.join('\n')
}

function isLeafLike(node: DapNode): boolean {
  if (node.type === 'act' && node.terminal && !node.on_success && !node.on_failure) return true
  if (node.type === 'delegate' && node.terminal) return true
  return false
}

function getDirectChildren(node: DapNode): Array<{ id: string; label?: string }> {
  const children: Array<{ id: string; label?: string }> = []
  if (node.next) children.push({ id: node.next })
  if (node.on_success) children.push({ id: node.on_success, label: 'success' })
  if (node.on_failure) children.push({ id: node.on_failure, label: 'failure' })
  if (node.on_return) children.push({ id: node.on_return, label: 'return' })
  return children
}

function getNodeDetail(node: DapNode): string {
  if (node.type === 'act') {
    if (node.action_type === 'intent' && node.intent) return `(intent: ${node.intent})`
    if (node.action_type === 'document' && node.ref) return `(${node.ref})`
    if (node.action_type === 'tool_call' && node.tool) return `(tool: ${node.tool})`
  }
  if (node.type === 'delegate' && node.delegate_to) return `(${node.delegate_to})`
  if (node.type === 'observe' && node.method) return `(${node.method})`
  return ''
}

/**
 * Render delegation graph between trees for `dap graph`.
 */
export function formatDelegationGraph(graph: DapGraph): string {
  const lines: string[] = ['DAP Delegation Graph', '']

  for (const [id, tree] of graph.trees) {
    const lc = lifecycleIcon(tree.lifecycle)
    const nodeCount = tree.nodes.size
    lines.push(`${lc} ${id} (${nodeCount} nodes) [${tree.metadata.confidence}]`)

    // Show delegations from this tree
    const outgoing = graph.delegations.filter((d) => d.source === id)
    for (let i = 0; i < outgoing.length; i++) {
      const d = outgoing[i]!
      const isLast = i === outgoing.length - 1
      const prefix = isLast ? '  \u2514\u2500\u2500 ' : '  \u251C\u2500\u2500 '
      lines.push(`${prefix}\u25B6 delegates to: ${d.target}`)
    }
    lines.push('')
  }

  if (graph.cycles.length > 0) {
    lines.push('Delegation Cycles:')
    for (const cycle of graph.cycles) {
      lines.push(`  \u26A0 ${cycle.join(' \u2192 ')}`)
    }
    lines.push('')
  }

  const stats = `${graph.trees.size} trees, ${graph.delegations.length} delegations, ${graph.cycles.length} cycles`
  lines.push(stats)

  return lines.join('\n')
}
