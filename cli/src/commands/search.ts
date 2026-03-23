import { buildGraph } from '../graph'
import { extractTitle, extractBody } from '../parser'
import { join } from 'path'

interface SearchResult {
  path: string
  score: number
  title: string
  matches: {
    title: boolean
    tags: string[]
    body: string[]
  }
}

export function searchCommand(
  root: string,
  query: string,
  flags: { type?: string; audience?: string; json?: boolean }
) {
  const graph = buildGraph(root)
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const results: SearchResult[] = []

  for (const [, node] of graph.nodes) {
    if (flags.type && node.metadata.type !== flags.type) continue
    if (flags.audience && !node.metadata.audience.includes(flags.audience)) continue

    const fullPath = join(root, node.path)
    const title = extractTitle(fullPath)
    const body = extractBody(fullPath)
    const titleLower = title.toLowerCase()
    const tags = node.metadata.tags ?? []
    const tagsLower = tags.map((t) => t.toLowerCase())

    let score = 0
    const matchedTags: string[] = []
    const bodySnippets: string[] = []
    let titleMatch = false

    // Check if ALL terms match somewhere in the document
    const allTermsMatch = terms.every(
      (term) =>
        titleLower.includes(term) ||
        tagsLower.some((t) => t.includes(term)) ||
        body.toLowerCase().includes(term)
    )

    if (!allTermsMatch) continue

    // Score title matches
    if (terms.every((term) => titleLower.includes(term))) {
      score += 3
      titleMatch = true
    }

    // Score tag matches
    for (const tag of tags) {
      if (terms.some((term) => tag.toLowerCase().includes(term))) {
        score += 2
        matchedTags.push(tag)
      }
    }

    // Score body matches and extract snippets
    const bodyLines = body.split('\n')
    for (let i = 0; i < bodyLines.length; i++) {
      const lineLower = bodyLines[i].toLowerCase()
      if (terms.some((term) => lineLower.includes(term))) {
        score += 1
        if (bodySnippets.length < 3) {
          const start = Math.max(0, i - 1)
          const end = Math.min(bodyLines.length, i + 2)
          const snippet = bodyLines
            .slice(start, end)
            .map((l) => l.trim())
            .filter(Boolean)
            .join(' ')
          if (snippet.length > 0) {
            bodySnippets.push(snippet.length > 120 ? snippet.slice(0, 120) + '...' : snippet)
          }
        }
      }
    }

    if (score > 0) {
      results.push({
        path: node.path,
        score,
        title,
        matches: { title: titleMatch, tags: matchedTags, body: bodySnippets },
      })
    }
  }

  results.sort((a, b) => b.score - a.score)

  if (flags.json) {
    console.log(JSON.stringify(results, null, 2))
    return
  }

  if (results.length === 0) {
    console.log(`No results for "${query}"`)
    return
  }

  console.log(`${results.length} result(s) for "${query}":`)
  console.log()

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    console.log(`  [${i + 1}] ${r.path} (score: ${r.score})`)
    console.log(`      Title: ${r.title}`)
    if (r.matches.tags.length > 0) {
      console.log(`      Tags: ${r.matches.tags.join(', ')}`)
    }
    if (r.matches.body.length > 0) {
      for (const snippet of r.matches.body) {
        console.log(`      ...${snippet}`)
      }
    }
    console.log()
  }
}
