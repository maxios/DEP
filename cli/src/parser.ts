import { readFileSync } from 'fs'
import matter from 'gray-matter'
import { resolve, dirname, relative } from 'path'
import type { DepMetadata, DepEdge } from './types'

export interface ParsedDocument {
  path: string
  metadata: DepMetadata
  typedLinks: DepEdge[]
  inlineLinks: DepEdge[]
}

export function parseDocument(filePath: string, projectRoot: string): ParsedDocument | null {
  const content = readFileSync(filePath, 'utf-8')
  const { data } = matter(content)

  if (!data.dep) return null

  const meta = data.dep as DepMetadata
  const relPath = relative(projectRoot, filePath)

  // Extract typed links from metadata
  const typedLinks: DepEdge[] = (meta.links ?? []).map((link) => ({
    source: relPath,
    target: resolveRelativePath(relPath, link.target),
    rel: link.rel,
  }))

  // Extract inline markdown links from body
  const bodyContent = content.slice(content.indexOf('---', 3) + 3) // skip frontmatter
  const inlineLinks = extractInlineLinks(bodyContent, relPath)

  return {
    path: relPath,
    metadata: meta,
    typedLinks,
    inlineLinks,
  }
}

function extractInlineLinks(content: string, sourcePath: string): DepEdge[] {
  const linkRegex = /\[([^\]]*)\]\(([^)]+\.md)\)/g
  const links: DepEdge[] = []
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(content)) !== null) {
    const target = match[2]
    // Skip external URLs
    if (target.startsWith('http://') || target.startsWith('https://')) continue
    // Skip anchor-only links
    if (target.startsWith('#')) continue

    links.push({
      source: sourcePath,
      target: resolveRelativePath(sourcePath, target),
      rel: 'INLINE',
    })
  }

  return links
}

function resolveRelativePath(fromPath: string, toPath: string): string {
  const fromDir = dirname(fromPath)
  const resolved = resolve(fromDir, toPath)
  // Make it relative to project root (remove leading /)
  return relative(process.cwd(), resolved)
}
