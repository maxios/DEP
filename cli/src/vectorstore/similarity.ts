import type { VectorChunk, VectorSearchResult } from '../types'

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export function searchVectors(
  queryEmbedding: Float32Array,
  allChunks: VectorChunk[],
  topK: number = 10,
  deduplicate: boolean = true
): VectorSearchResult[] {
  const scored = allChunks.map((chunk) => ({
    docPath: chunk.docPath,
    chunkIndex: chunk.chunkIndex,
    headingPath: chunk.headingPath,
    content: chunk.content,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }))

  scored.sort((a, b) => b.score - a.score)

  if (!deduplicate) {
    return scored.slice(0, topK)
  }

  // Return best chunk per doc
  const seen = new Set<string>()
  const results: VectorSearchResult[] = []
  for (const item of scored) {
    if (seen.has(item.docPath)) continue
    seen.add(item.docPath)
    results.push(item)
    if (results.length >= topK) break
  }
  return results
}
