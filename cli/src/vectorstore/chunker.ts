import { join } from 'path'
import { extractTitle, extractBody, parseDocument } from '../parser'

export interface DocChunk {
  headingPath: string
  content: string
}

const DEFAULT_MAX_CHARS = 2000 // ~512 tokens

export function chunkDocument(
  filePath: string,
  projectRoot: string,
  maxChars: number = DEFAULT_MAX_CHARS
): DocChunk[] {
  const chunks: DocChunk[] = []
  const parsed = parseDocument(filePath, projectRoot)
  if (!parsed) return chunks

  const title = extractTitle(filePath)
  const body = extractBody(filePath)
  const meta = parsed.metadata

  // Synthetic metadata chunk
  const metaParts = [`Document: ${title}`]
  if (meta.type) metaParts.push(`Type: ${meta.type}`)
  if (meta.tags?.length) metaParts.push(`Tags: ${meta.tags.join(', ')}`)
  if (meta.audience?.length) metaParts.push(`Audience: ${meta.audience.join(', ')}`)
  chunks.push({ headingPath: '[metadata]', content: metaParts.join('. ') })

  // Split body by headings
  const sections = splitByHeadings(body)

  for (const section of sections) {
    const contextPrefix = section.headingPath ? `${title} > ${section.headingPath}\n\n` : `${title}\n\n`
    const fullContent = contextPrefix + section.content

    if (fullContent.length <= maxChars) {
      chunks.push({ headingPath: section.headingPath, content: fullContent })
    } else {
      // Split large sections at paragraph boundaries
      const paragraphs = section.content.split(/\n\n+/)
      let current = contextPrefix
      for (const para of paragraphs) {
        if (current.length + para.length + 2 > maxChars && current.length > contextPrefix.length) {
          chunks.push({ headingPath: section.headingPath, content: current.trim() })
          current = contextPrefix
        }
        current += para + '\n\n'
      }
      if (current.trim().length > contextPrefix.length) {
        chunks.push({ headingPath: section.headingPath, content: current.trim() })
      }
    }
  }

  return chunks
}

interface Section {
  headingPath: string
  content: string
}

function splitByHeadings(body: string): Section[] {
  const lines = body.split('\n')
  const sections: Section[] = []
  let currentHeading = ''
  let currentContent: string[] = []
  const headingStack: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/)
    const h3Match = line.match(/^###\s+(.+)$/)

    if (h2Match || h3Match) {
      // Flush previous section
      if (currentContent.length > 0) {
        const text = currentContent.join('\n').trim()
        if (text) sections.push({ headingPath: currentHeading, content: text })
      }

      if (h2Match) {
        headingStack.length = 0
        headingStack.push(h2Match[1]!)
      } else if (h3Match) {
        if (headingStack.length > 1) headingStack.pop()
        headingStack.push(h3Match[1]!)
      }
      currentHeading = headingStack.join(' > ')
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Flush last section
  if (currentContent.length > 0) {
    const text = currentContent.join('\n').trim()
    if (text) sections.push({ headingPath: currentHeading, content: text })
  }

  // If no headings found, return entire body as one section
  if (sections.length === 0 && body.trim()) {
    sections.push({ headingPath: '', content: body.trim() })
  }

  return sections
}
