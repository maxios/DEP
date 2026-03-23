import { buildGraph } from '../graph'
import { loadDocspec } from '../config'
import { extractTitle as extractTitleFromPath } from '../parser'
import { writeFileSync } from 'fs'
import { join, relative, dirname, basename } from 'path'
import type { DepNode } from '../types'

export function indexCommand(root: string, flags: { json?: boolean; dry?: boolean }) {
  const config = loadDocspec(root)
  const graph = buildGraph(root)

  const generated: Array<{ path: string; content: string }> = []

  // Generate per-directory index files
  const dirMap = config.architecture.directory_map
  for (const [typeName, dirPath] of Object.entries(dirMap)) {
    const fullDirPath = join(root, dirPath)
    const indexPath = join(fullDirPath, 'index.md')
    const relIndexPath = relative(root, indexPath)

    // Get all documents in this directory (excluding index.md)
    const docsInDir = Array.from(graph.nodes.values()).filter((n) => {
      const nodeDir = dirname(n.path)
      return nodeDir === dirPath && basename(n.path) !== 'index.md'
    })

    if (docsInDir.length === 0) continue

    const content = generateDirectoryIndex(typeName, docsInDir)
    generated.push({ path: relIndexPath, content })
  }

  // Generate root index
  const rootIndexPath = join(root, config.project.docs_root, 'index.md')
  const rootRelPath = relative(root, rootIndexPath)
  const rootContent = generateRootIndex(graph, config)
  generated.push({ path: rootRelPath, content: rootContent })

  if (flags.json) {
    console.log(JSON.stringify(generated, null, 2))
    return
  }

  if (flags.dry) {
    for (const file of generated) {
      console.log(`Would write: ${file.path}`)
    }
    return
  }

  for (const file of generated) {
    const fullPath = join(root, file.path)
    writeFileSync(fullPath, file.content)
    console.log(`Updated: ${file.path}`)
  }
}

function generateDirectoryIndex(typeName: string, docs: DepNode[]): string {
  const sorted = docs.sort((a, b) => a.path.localeCompare(b.path))

  const lines: string[] = [
    `<!-- dep:auto-generated -->`,
    `# ${capitalize(typeName)}`,
    '',
  ]

  // Group by audience
  const audiences = new Set<string>()
  for (const doc of sorted) {
    for (const a of doc.metadata.audience) audiences.add(a)
  }

  for (const doc of sorted) {
    const title = extractTitle(doc)
    const lifecycle = lifecycleIcon(doc.lifecycle)
    const fileName = basename(doc.path)
    lines.push(`- [${title}](${fileName}) ${lifecycle} \`${doc.metadata.confidence}\` — ${doc.metadata.audience.join(', ')}`)
  }

  return lines.join('\n') + '\n'
}

function generateRootIndex(graph: ReturnType<typeof buildGraph>, config: ReturnType<typeof loadDocspec>): string {
  const lines: string[] = [
    '---',
    'dep:',
    '  type: reference',
    `  audience: [${config.audiences.map((a) => a.id).join(', ')}]`,
    '  owner: "@dep-core"',
    `  created: 2026-03-22`,
    `  last_verified: ${new Date().toISOString()}`,
    '  confidence: high',
    '  depends_on: [.docspec]',
    '  tags: [navigation, root, index]',
    '  links: []',
    '---',
    '',
    `# ${config.project.name} — Documentation Root`,
    '',
    `> ${config.project.description ?? ''}`,
    '',
    '---',
    '',
    '## By Audience',
    '',
  ]

  for (const audience of config.audiences) {
    lines.push(`### ${audience.name}`)
    lines.push('')
    const epPath = audience.entry_point.replace(/^\.\//, '')
    const epRelPath = relative(config.project.docs_root, epPath)
    lines.push(`**Entry point**: [${basename(audience.entry_point)}](${epRelPath})`)
    lines.push('')

    // Find all docs for this audience
    const docs = Array.from(graph.nodes.values()).filter((n) =>
      n.metadata.audience.includes(audience.id) && !n.path.endsWith('index.md')
    )

    for (const doc of docs) {
      const title = extractTitle(doc)
      const relPath = relative('docs', doc.path)
      lines.push(`- [${title}](${relPath})`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('## By Type')
  lines.push('')

  // Group by type
  const byType = new Map<string, DepNode[]>()
  for (const [, node] of graph.nodes) {
    if (node.path.endsWith('index.md')) continue
    const type = node.metadata.type
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(node)
  }

  for (const [type, nodes] of byType) {
    lines.push(`### ${capitalize(type)}`)
    lines.push('')
    for (const node of nodes) {
      const title = extractTitle(node)
      const relPath = relative('docs', node.path)
      lines.push(`- [${title}](${relPath})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function extractTitle(node: DepNode): string {
  const fullPath = join(process.cwd(), node.path)
  return extractTitleFromPath(fullPath)
}

function capitalize(s: string): string {
  return s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function lifecycleIcon(state: string): string {
  switch (state) {
    case 'FRESH': return '●'
    case 'AGING': return '◐'
    case 'STALE': return '○'
    default: return '?'
  }
}
