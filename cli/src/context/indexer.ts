import { readFileSync } from 'fs'
import { join, relative, resolve } from 'path'
import type { DepGraph, DocspecConfig } from '../types'
import type { EmbeddingProvider } from '../embeddings/provider'
import { chunkDocument } from '../vectorstore/chunker'
import {
  openVectorDB, initDB, getDocHash, upsertChunks, removeDoc, getAllIndexedDocs, getMeta, setMeta, hashContent, clearIndex,
} from '../vectorstore/db'
import { DepError } from './errors'
import type { IndexOptions, IndexReport } from './types'
import { posix } from '../paths'

export interface IndexContext {
  root: string
  config: DocspecConfig
  graph: DepGraph
  provider: EmbeddingProvider
}

/**
 * Bring the index up to date with the documents on disk. Only documents whose
 * content changed are embedded again; the rest are reused. Returns what
 * happened instead of printing it.
 */
export async function runIndex(ctx: IndexContext, options: IndexOptions = {}): Promise<IndexReport> {
  const { root, config, graph, provider } = ctx
  const maxChars = (config.vectorization?.chunk_max_tokens ?? 512) * 4

  let documents = [...graph.nodes.keys()]
  if (options.only !== undefined) {
    const normalized = posix(relative(root, resolve(root, options.only)))
    if (!graph.nodes.has(normalized)) {
      throw new DepError('OUTSIDE_SET', `${options.only} is outside the documentation set`, { document: options.only })
    }
    documents = [normalized]
  }

  const db = openVectorDB(root)
  initDB(db)

  try {
    const storedModel = getMeta(db, 'model_name')
    if (storedModel && storedModel !== provider.name && !options.force) {
      throw new DepError(
        'PROVIDER_MISMATCH',
        `the index was built with "${storedModel}" and cannot be mixed with "${provider.name}"; rebuild it in full with --force`,
        { indexed: storedModel, configured: provider.name }
      )
    }
    if (options.force) clearIndex(db)

    const report: IndexReport = {
      processed: [], reused: [], removed: [], unreadable: [...(graph.unreadable ?? [])], chunks: 0, provider: provider.name,
      builtAt: getMeta(db, 'built_at'), incomplete: false,
    }

    setMeta(db, 'in_progress', 'true')

    for (const document of documents) {
      if (options.signal?.aborted) {
        report.incomplete = true
        break
      }
      const fullPath = join(root, document)
      let content: string
      try {
        content = readFileSync(fullPath, 'utf-8')
      } catch {
        report.unreadable.push(document)
        continue
      }
      const currentHash = hashContent(content)
      if (getDocHash(db, document) === currentHash) {
        report.reused.push(document)
        continue
      }
      const chunks = chunkDocument(fullPath, root, maxChars)
      if (chunks.length === 0) {
        report.reused.push(document)
        continue
      }
      const embeddings = await provider.embed(chunks.map((c) => c.content))
      upsertChunks(db, document, chunks.map((chunk, i) => ({ headingPath: chunk.headingPath, content: chunk.content, embedding: embeddings[i]! })), currentHash)
      report.chunks += chunks.length
      report.processed.push(document)
      options.onProgress?.(document)
    }

    if (!report.incomplete && options.only === undefined) {
      const current = new Set(documents)
      for (const indexed of getAllIndexedDocs(db)) {
        if (!current.has(indexed)) {
          removeDoc(db, indexed)
          report.removed.push(indexed)
        }
      }
    }

    setMeta(db, 'model_name', provider.name)
    setMeta(db, 'embedding_dim', String(provider.dimensions))
    if (!report.incomplete) {
      const builtAt = new Date().toISOString()
      setMeta(db, 'built_at', builtAt)
      setMeta(db, 'in_progress', 'false')
      report.builtAt = builtAt
    }
    return report
  } finally {
    db.close()
  }
}
