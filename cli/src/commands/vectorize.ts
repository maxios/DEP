import { readFileSync } from 'fs'
import { join } from 'path'
import { buildGraph } from '../graph'
import { loadDocspec } from '../config'
import { createProvider } from '../embeddings/provider'
import { chunkDocument } from '../vectorstore/chunker'
import {
  openVectorDB, initDB, getDocHash, upsertChunks,
  removeDoc, getAllIndexedDocs, getMeta, setMeta, hashContent,
} from '../vectorstore/db'
import type { VectorizationConfig } from '../types'

export async function vectorizeCommand(
  root: string,
  flags: { json?: boolean; force?: boolean; provider?: string; dry?: boolean }
) {
  const config = loadDocspec(root)
  const vecConfig: VectorizationConfig = {
    provider: (flags.provider as 'local' | 'openai') || config.vectorization?.provider || 'local',
    model: config.vectorization?.model,
    chunk_max_tokens: config.vectorization?.chunk_max_tokens,
  }

  const graph = buildGraph(root)
  const docPaths = [...graph.nodes.keys()]
  const maxChars = (vecConfig.chunk_max_tokens ?? 512) * 4 // rough token→char

  if (flags.dry) {
    const stats = { total: docPaths.length, chunks: 0, docs: [] as Array<{ path: string; chunks: number }> }
    for (const docPath of docPaths) {
      const fullPath = join(root, docPath)
      const chunks = chunkDocument(fullPath, root, maxChars)
      stats.chunks += chunks.length
      stats.docs.push({ path: docPath, chunks: chunks.length })
    }
    if (flags.json) {
      console.log(JSON.stringify(stats, null, 2))
    } else {
      console.log(`Dry run: ${stats.total} docs, ${stats.chunks} total chunks`)
      for (const doc of stats.docs) {
        console.log(`  ${doc.path} (${doc.chunks} chunks)`)
      }
    }
    return
  }

  // Initialize provider
  console.log(`Initializing ${vecConfig.provider} embedding provider...`)
  const provider = await createProvider(vecConfig)
  await provider.init()

  // Open/create DB
  const db = openVectorDB(root)
  initDB(db)

  // Check for model mismatch
  const storedModel = getMeta(db, 'model_name')
  const storedDims = getMeta(db, 'embedding_dim')
  if (storedModel && storedModel !== provider.name && !flags.force) {
    console.error(`Model mismatch: index uses "${storedModel}" but current provider is "${provider.name}"`)
    console.error('Use --force to rebuild the index with the new model.')
    db.close()
    provider.dispose()
    process.exit(1)
  }

  let created = 0
  let updated = 0
  let skipped = 0
  let totalChunks = 0

  for (const docPath of docPaths) {
    const fullPath = join(root, docPath)
    const content = readFileSync(fullPath, 'utf-8')
    const currentHash = hashContent(content)
    const storedHash = getDocHash(db, docPath)

    if (!flags.force && storedHash === currentHash) {
      skipped++
      continue
    }

    const chunks = chunkDocument(fullPath, root, maxChars)
    if (chunks.length === 0) {
      skipped++
      continue
    }

    // Embed all chunks
    const texts = chunks.map((c) => c.content)
    const embeddings = await provider.embed(texts)

    const dbChunks = chunks.map((chunk, i) => ({
      headingPath: chunk.headingPath,
      content: chunk.content,
      embedding: embeddings[i]!,
    }))

    upsertChunks(db, docPath, dbChunks, currentHash)
    totalChunks += chunks.length

    if (storedHash) {
      updated++
    } else {
      created++
    }

    if (!flags.json) {
      process.stdout.write(`\r  Indexed ${created + updated}/${docPaths.length - skipped} docs...`)
    }
  }

  // Remove docs no longer in graph
  const indexedDocs = getAllIndexedDocs(db)
  const currentDocSet = new Set(docPaths)
  let removed = 0
  for (const indexed of indexedDocs) {
    if (!currentDocSet.has(indexed)) {
      removeDoc(db, indexed)
      removed++
    }
  }

  // Store metadata
  setMeta(db, 'model_name', provider.name)
  setMeta(db, 'embedding_dim', String(provider.dimensions))

  provider.dispose()
  db.close()

  if (flags.json) {
    console.log(JSON.stringify({ created, updated, skipped, removed, totalChunks, model: provider.name }, null, 2))
  } else {
    console.log(`\nVectorized ${docPaths.length} docs (${created} new, ${updated} updated, ${skipped} skipped${removed ? `, ${removed} removed` : ''}), ${totalChunks} total chunks`)
    console.log(`Model: ${provider.name} (${provider.dimensions}d)`)
    console.log(`Index: .dep-vectors.db`)
  }
}
