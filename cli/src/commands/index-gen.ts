import { buildGraph } from '../graph'
import { loadDocspec } from '../config'
import { extractTitle as extractTitleFromPath } from '../parser'
import { existsSync, writeFileSync } from 'fs'
import { join, relative, dirname, basename, posix as posixPath } from 'path'
import { stringify as yamlStringify } from 'yaml'
import type { DepNode } from '../types'
import { posix } from '../paths'
import { generateTimestamp, readDepFile } from '../writer'

export function indexCommand(root: string, flags: { json?: boolean; dry?: boolean }) {
  const config = loadDocspec(root)
  const graph = buildGraph(root)

  const generated: Array<{ path: string; content: string }> = []

  // Generate per-directory index files
  const dirMap = config.architecture.directory_map
  for (const [typeName, dirPath] of Object.entries(dirMap)) {
    const fullDirPath = join(root, dirPath)
    const indexPath = join(fullDirPath, 'index.md')
    const relIndexPath = posix(relative(root, indexPath))

    // Get all documents in this directory (excluding index.md)
    const docsInDir = Array.from(graph.nodes.values()).filter((n) => {
      const nodeDir = dirname(n.path)
      return nodeDir === dirPath && basename(n.path) !== 'index.md'
    })

    if (docsInDir.length === 0) continue

    const content = generateDirectoryIndex(root, typeName, docsInDir)
    generated.push({ path: relIndexPath, content })
  }

  // Generate root index
  const rootIndexPath = join(root, config.project.docs_root, 'index.md')
  const rootRelPath = posix(relative(root, rootIndexPath))
  const rootContent = generateRootIndex(root, rootRelPath, graph, config)
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

function generateDirectoryIndex(root: string, typeName: string, docs: DepNode[]): string {
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
    const title = extractTitle(root, doc)
    const lifecycle = lifecycleIcon(doc.lifecycle)
    const fileName = basename(doc.path)
    lines.push(`- [${title}](${fileName}) ${lifecycle} \`${doc.metadata.confidence}\` — ${doc.metadata.audience.join(', ')}`)
  }

  return lines.join('\n') + '\n'
}

/**
 * What the root index says about itself. One already on disk keeps its owner,
 * its creation date, its tags and the relationships it declares — the generator
 * owns the listing under them, not them. A first root index belongs to the
 * project's fallback owner. Either way it serves every audience and was
 * verified now, since it was just rebuilt from the set.
 */
function rootIndexMetadata(path: string, config: ReturnType<typeof loadDocspec>): Record<string, unknown> {
  const now = generateTimestamp()
  const audience = config.audiences.map((a) => a.id)
  if (existsSync(path)) {
    try {
      return { ...readDepFile(path).dep, audience, last_verified: now }
    } catch {
      // not a DEP document yet: it starts afresh below
    }
  }
  return {
    type: 'reference',
    audience,
    owner: config.governance.fallback_owner,
    created: now,
    last_verified: now,
    confidence: 'high',
    depends_on: ['.docspec'],
    tags: ['navigation', 'root', 'index'],
    links: [],
  }
}

function generateRootIndex(
  root: string,
  rootRelPath: string,
  graph: ReturnType<typeof buildGraph>,
  config: ReturnType<typeof loadDocspec>,
): string {
  // Links are written from where the root index sits, whatever the documentation root is called.
  const indexDir = posixPath.dirname(rootRelPath)
  const linkTo = (path: string) => posixPath.relative(indexDir, posix(path))
  const dep = rootIndexMetadata(join(root, rootRelPath), config)
  const lines: string[] = [
    '---',
    yamlStringify({ dep }, { lineWidth: 0 }).trim(),
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
    lines.push(`**Entry point**: [${basename(audience.entry_point)}](${linkTo(epPath)})`)
    lines.push('')

    // Find all docs for this audience
    const docs = Array.from(graph.nodes.values()).filter((n) =>
      n.metadata.audience.includes(audience.id) && !n.path.endsWith('index.md')
    )

    for (const doc of docs) {
      lines.push(`- [${extractTitle(root, doc)}](${linkTo(doc.path)})`)
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
      lines.push(`- [${extractTitle(root, node)}](${linkTo(node.path)})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/** A document's title, read from the project root rather than from wherever the request was made. */
function extractTitle(root: string, node: DepNode): string {
  return extractTitleFromPath(join(root, node.path))
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
