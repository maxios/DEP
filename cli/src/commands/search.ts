import { buildGraph } from '../graph'
import { extractTitle, extractBody } from '../parser'
import { join } from 'path'
import { loadDocspec } from '../config'
import { vectorDBExists, openVectorDB, getAllEmbeddings } from '../vectorstore/db'
import { searchVectors } from '../vectorstore/similarity'
import { createProvider } from '../embeddings/provider'
import type { VectorizationConfig } from '../types'

interface SearchResult {
  path: string
  score: number
  title: string
  matches: {
    title: boolean
    tags: string[]
    body: string[]
  }
  semanticScore?: number
  matchedChunk?: string
}

export async function searchCommand(
  root: string,
  query: string,
  flags: { type?: string; audience?: string; json?: boolean; semantic?: boolean; hybrid?: boolean }
) {
  if (flags.semantic || flags.hybrid) {
    return semanticSearch(root, query, flags)
  }
  return keywordSearch(root, query, flags)
}

function keywordSearch(
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
  printResults(results, query, flags.json)
}

async function semanticSearch(
  root: string,
  query: string,
  flags: { type?: string; audience?: string; json?: boolean; semantic?: boolean; hybrid?: boolean }
) {
  if (!vectorDBExists(root)) {
    console.error('No vector index found. Run `dep vectorize` first.')
    process.exit(1)
  }

  const config = loadDocspec(root)
  const vecConfig: VectorizationConfig = {
    provider: config.vectorization?.provider || 'local',
    model: config.vectorization?.model,
  }

  // Embed the query
  const provider = await createProvider(vecConfig)
  await provider.init()
  const [queryEmbedding] = await provider.embed([query])
  provider.dispose()

  // Load vectors and search
  const db = openVectorDB(root)
  const allChunks = getAllEmbeddings(db)
  db.close()

  const semanticResults = searchVectors(queryEmbedding!, allChunks, 20)

  // Apply metadata filters
  const graph = buildGraph(root)
  const filteredSemantic = semanticResults.filter((r) => {
    const node = graph.nodes.get(r.docPath)
    if (!node) return false
    if (flags.type && node.metadata.type !== flags.type) return false
    if (flags.audience && !node.metadata.audience.includes(flags.audience)) return false
    return true
  })

  if (flags.hybrid) {
    // Combine with keyword scores
    const keywordScores = new Map<string, number>()
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

    for (const [, node] of graph.nodes) {
      if (flags.type && node.metadata.type !== flags.type) continue
      if (flags.audience && !node.metadata.audience.includes(flags.audience)) continue

      const fullPath = join(root, node.path)
      const title = extractTitle(fullPath)
      const body = extractBody(fullPath)
      const titleLower = title.toLowerCase()
      const tags = node.metadata.tags ?? []

      let score = 0
      if (terms.every((t) => titleLower.includes(t))) score += 3
      for (const tag of tags) {
        if (terms.some((t) => tag.toLowerCase().includes(t))) score += 2
      }
      const bodyLines = body.split('\n')
      for (const line of bodyLines) {
        if (terms.some((t) => line.toLowerCase().includes(t))) score += 1
      }
      if (score > 0) keywordScores.set(node.path, score)
    }

    // Normalize keyword scores
    const maxKeyword = Math.max(1, ...keywordScores.values())

    const results: SearchResult[] = filteredSemantic.map((sr) => {
      const node = graph.nodes.get(sr.docPath)!
      const fullPath = join(root, sr.docPath)
      const kwScore = (keywordScores.get(sr.docPath) ?? 0) / maxKeyword
      const hybridScore = 0.7 * sr.score + 0.3 * kwScore

      return {
        path: sr.docPath,
        score: hybridScore,
        title: extractTitle(fullPath),
        matches: { title: false, tags: [], body: [] },
        semanticScore: sr.score,
        matchedChunk: sr.content.length > 150 ? sr.content.slice(0, 150) + '...' : sr.content,
      }
    })

    // Also add keyword-only results not in semantic results
    const semanticPaths = new Set(filteredSemantic.map((r) => r.docPath))
    for (const [path, kwScore] of keywordScores) {
      if (semanticPaths.has(path)) continue
      const node = graph.nodes.get(path)
      if (!node) continue
      const fullPath = join(root, path)
      results.push({
        path,
        score: 0.3 * (kwScore / maxKeyword),
        title: extractTitle(fullPath),
        matches: { title: false, tags: [], body: [] },
      })
    }

    results.sort((a, b) => b.score - a.score)
    printResults(results.slice(0, 10), query, flags.json)
  } else {
    // Pure semantic
    const results: SearchResult[] = filteredSemantic.slice(0, 10).map((sr) => {
      const fullPath = join(root, sr.docPath)
      return {
        path: sr.docPath,
        score: sr.score,
        title: extractTitle(fullPath),
        matches: { title: false, tags: [], body: [] },
        semanticScore: sr.score,
        matchedChunk: sr.content.length > 150 ? sr.content.slice(0, 150) + '...' : sr.content,
      }
    })

    printResults(results, query, flags.json)
  }
}

function printResults(results: SearchResult[], query: string, json?: boolean) {
  if (json) {
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
    const r = results[i]!
    const scoreStr = r.semanticScore !== undefined
      ? `similarity: ${r.semanticScore.toFixed(3)}`
      : `score: ${r.score}`
    console.log(`  [${i + 1}] ${r.path} (${scoreStr})`)
    console.log(`      Title: ${r.title}`)
    if (r.matchedChunk) {
      console.log(`      Chunk: ${r.matchedChunk}`)
    }
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
