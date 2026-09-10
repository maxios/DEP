import { join } from 'path'
import { buildGraph } from '../graph'
import { loadDocspec } from '../config'
import { createProvider } from '../embeddings/provider'
import { chunkDocument } from '../vectorstore/chunker'
import { openDocumentationSet, DepError } from '../lib'
import type { EmbeddingProvider } from '../embeddings/provider'
import type { VectorizationConfig } from '../types'

export async function vectorizeCommand(
  root: string,
  flags: { json?: boolean; force?: boolean; provider?: string; dry?: boolean; installHook?: boolean; only?: string }
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

  let embeddings: EmbeddingProvider | undefined
  if (flags.provider) embeddings = await createProvider(vecConfig)

  try {
    const set = openDocumentationSet(root, embeddings ? { embeddings } : {})
    if (flags.installHook) {
      const hook = set.installIndexHook()
      if (flags.json) console.log(JSON.stringify(hook, null, 2))
      else console.log(`Installed ${hook.path}\n  runs: ${hook.command} vectorize --root . --json`)
      set.close()
      return
    }
    if (!flags.json) console.log(`Initializing ${vecConfig.provider} embedding provider...`)
    const report = await set.index({ force: flags.force, only: flags.only })
    set.close()

    if (flags.json) {
      console.log(JSON.stringify(report, null, 2))
      return
    }
    const total = report.processed.length + report.reused.length
    console.log(`Vectorized ${total} docs (${report.processed.length} processed, ${report.reused.length} reused${report.removed.length ? `, ${report.removed.length} removed` : ''}), ${report.chunks} chunks`)
    for (const doc of report.processed) console.log(`  processed ${doc}`)
    for (const doc of report.unreadable) console.log(`  could not read ${doc}`)
    if (report.incomplete) console.log('  update did not finish; run again to resume')
    console.log(`Model: ${report.provider}`)
    console.log('Index: .dep-vectors.db')
  } catch (err) {
    if (err instanceof DepError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }
}
