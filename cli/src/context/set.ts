import { existsSync, statSync, readFileSync } from 'fs'
import { join } from 'path'
import { loadDocspec } from '../config'
import { buildGraph } from '../graph'
import { extractTitle } from '../parser'
import { createProvider, type EmbeddingProvider } from '../embeddings/provider'
import { chunkDocument } from '../vectorstore/chunker'
import { vectorDBExists, openVectorDB, getAllEmbeddings, getMeta, getAllDocHashes, hashContent } from '../vectorstore/db'
import type { DepGraph, DocspecConfig, VectorizationConfig } from '../types'
import { DepError } from './errors'
import { normalizeOptions } from './options'
import { retrieve, type RetrievalContext } from './retrieve'
import { runIndex } from './indexer'
import { estimateTokens, inverseDocumentFrequency } from './tokens'
import { computeFreshness } from './freshness'
import { runValidation, type ValidationReport } from '../commands/validate'
import type {
  Bundle, CandidateChunk, ContextOptions, DocumentMetadata, IndexOptions, IndexReport, OpenOptions, SearchOptions, SearchResults,
} from './types'
import { relative, resolve } from 'path'

const METADATA_SECTION = '[metadata]'

/**
 * A documentation set opened once and asked many things. Reads the project
 * from disk on first use and again only when asked to refresh; every request
 * returns a value or throws a DepError. Nothing is printed.
 */
export class DocumentationSet {
  readonly root: string
  readonly stats = { loads: 0 }

  private readonly options: OpenOptions
  private readonly now: () => Date
  private _config: DocspecConfig
  private _graph: DepGraph | null = null
  private _titles = new Map<string, string>()
  private _fileHashes = new Map<string, string>()
  private _provider: EmbeddingProvider | null = null
  private _providerReady = false

  constructor(root: string, options: OpenOptions = {}) {
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      throw new DepError('NOT_A_DIRECTORY', `${root} is not a directory`, { root })
    }
    const docspec = join(root, '.docspec')
    if (!existsSync(docspec)) {
      throw new DepError('CONFIG_MISSING', `no DEP configuration found: ${docspec} is missing`, { file: '.docspec', root })
    }
    this.root = root
    this.options = options
    this.now = options.now ?? (() => new Date())
    this._config = loadDocspec(root)
  }

  config(): DocspecConfig {
    return this._config
  }

  graph(): DepGraph {
    this.ensureLoaded()
    return this._graph!
  }

  /** Read the project from disk again. Call after documents change. */
  refresh(): void {
    this._graph = null
    this.ensureLoaded()
  }

  async context(question: string, options: ContextOptions = {}): Promise<Bundle> {
    const normalized = normalizeOptions(options, this._config)
    this.ensureLoaded()

    const index: RetrievalContext['index'] = { present: false, builtAt: null, provider: null, incomplete: false, hashes: new Map(), missing: [] }
    let chunks: CandidateChunk[]
    let queryEmbedding: Float32Array | null = null

    if (vectorDBExists(this.root)) {
      const db = openVectorDB(this.root)
      try {
        index.present = true
        index.builtAt = getMeta(db, 'built_at')
        index.provider = getMeta(db, 'model_name')
        index.incomplete = getMeta(db, 'in_progress') === 'true'
        index.hashes = getAllDocHashes(db)
        chunks = getAllEmbeddings(db)
          .filter((c) => c.headingPath !== METADATA_SECTION)
          .map((c) => ({
            document: c.docPath,
            chunkIndex: c.chunkIndex,
            section: c.headingPath || '(top)',
            content: c.content,
            tokens: estimateTokens(c.content),
            embedding: c.embedding,
          }))
      } finally {
        db.close()
      }
      for (const document of index.hashes.keys()) {
        if (!this._graph!.nodes.has(document) && !existsSync(join(this.root, document))) index.missing.push(document)
      }
      const provider = await this.provider()
      if (index.provider && index.provider !== provider.name) {
        throw new DepError(
          'PROVIDER_MISMATCH',
          `the index was built with "${index.provider}" but the configured retrieval method is "${provider.name}"; rebuild it in full with --force`,
          { indexed: index.provider, configured: provider.name }
        )
      }
      queryEmbedding = await this.embedQuestion(provider, question, chunks)
    } else {
      chunks = this.chunkOnTheFly()
    }

    return retrieve(question, normalized, {
      config: this._config,
      graph: this._graph!,
      titles: this._titles,
      now: this.now(),
      chunks,
      queryEmbedding,
      index,
      fileHashes: this._fileHashes,
      usage: null,
      usageVersion: 0,
    })
  }

  /** Documents ranked for a query — the same ranking a bundle uses, without a budget. */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResults> {
    const bundle = await this.context(query, {
      budget: Number.MAX_SAFE_INTEGER,
      audience: options.audience,
      type: options.type,
      tags: options.tags,
      within: options.within,
      freshness: options.freshness ?? 'include-stale',
      expand: false,
    })
    const seen = new Set<string>()
    const results: SearchResults['results'] = []
    for (const p of bundle.passages) {
      if (seen.has(p.document)) continue
      seen.add(p.document)
      results.push({ document: p.document, title: p.title, section: p.section, score: p.score, snippet: p.content.slice(0, 200), freshness: p.freshness })
      if (results.length >= (options.limit ?? 10)) break
    }
    return { query, ranking: bundle.ranking, considered: bundle.considered, results }
  }

  /** One verdict per document plus a verdict on the set as a whole. */
  validate(): ValidationReport {
    this.ensureLoaded()
    return runValidation(this.root, this._config, this._graph!)
  }

  /** A document's declared metadata, with its computed freshness. */
  metadata(document: string): DocumentMetadata {
    this.ensureLoaded()
    const path = relative(this.root, resolve(this.root, document))
    const node = this._graph!.nodes.get(path)
    if (!node) {
      throw new DepError('DOCUMENT_NOT_FOUND', `${document} is not a document in the set`, { document })
    }
    const meta = node.metadata as unknown as Record<string, unknown>
    const declared: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(meta)) declared[key] = value instanceof Date ? value.toISOString() : value
    const freshness = computeFreshness(node.metadata, this._config, this.now())
    return {
      path,
      title: this._titles.get(path) ?? path,
      declared,
      lifecycle: node.lifecycle,
      freshness: { state: freshness.state, lastVerified: freshness.lastVerified, cadenceDays: freshness.cadenceDays },
      links: node.forwardLinks.map((e) => ({ target: e.target, rel: e.rel })),
      backlinks: node.backlinks.map((e) => ({ source: e.source, rel: e.rel })),
    }
  }

  async index(options: IndexOptions = {}): Promise<IndexReport> {
    this.refresh()
    const provider = await this.provider()
    return runIndex({ root: this.root, config: this._config, graph: this._graph!, provider }, options)
  }

  close(): void {
    if (this._provider && this._providerReady) this._provider.dispose()
    this._provider = null
    this._providerReady = false
  }

  // ── internals ─────────────────────────────────────────────────────────

  private ensureLoaded(): void {
    if (this._graph) return
    this._config = loadDocspec(this.root)
    this._graph = buildGraph(this.root)
    this._titles = new Map()
    this._fileHashes = new Map()
    for (const path of this._graph.nodes.keys()) {
      const full = join(this.root, path)
      this._titles.set(path, extractTitle(full))
      try {
        this._fileHashes.set(path, hashContent(readFileSync(full, 'utf-8')))
      } catch {
        // unreadable documents are already reported by the graph
      }
    }
    this.stats.loads++
  }

  private chunkOnTheFly(): CandidateChunk[] {
    const maxChars = (this._config.vectorization?.chunk_max_tokens ?? 512) * 4
    const out: CandidateChunk[] = []
    for (const path of this._graph!.nodes.keys()) {
      let docChunks: ReturnType<typeof chunkDocument>
      try {
        docChunks = chunkDocument(join(this.root, path), this.root, maxChars)
      } catch {
        continue
      }
      docChunks.forEach((c, i) => {
        if (c.headingPath === METADATA_SECTION) return
        out.push({ document: path, chunkIndex: i, section: c.headingPath || '(top)', content: c.content, tokens: estimateTokens(c.content), embedding: null })
      })
    }
    return out
  }

  private async embedQuestion(provider: EmbeddingProvider, question: string, chunks: CandidateChunk[]): Promise<Float32Array | null> {
    const weighted = provider as EmbeddingProvider & { embedQuery?: (text: string, idf: (term: string) => number) => Float32Array }
    if (typeof weighted.embedQuery === 'function') {
      return weighted.embedQuery(question, inverseDocumentFrequency(chunks.map((c) => c.content)))
    }
    return (await provider.embed([question]))[0] ?? null
  }

  private async provider(): Promise<EmbeddingProvider> {
    if (this._provider && this._providerReady) return this._provider
    if (!this._provider) {
      if (this.options.embeddings) {
        this._provider = this.options.embeddings
      } else {
        const vec: VectorizationConfig = {
          provider: this._config.vectorization?.provider ?? 'local',
          model: this._config.vectorization?.model,
        }
        this._provider = await createProvider(vec)
      }
    }
    try {
      await this._provider.init()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (/api key|credential/i.test(message)) {
        throw new DepError('CREDENTIAL_MISSING', `the configured retrieval method needs a credential that is not set: DEP_OPENAI_API_KEY (or OPENAI_API_KEY)`, { provider: this._provider.name, credential: 'DEP_OPENAI_API_KEY' })
      }
      throw err
    }
    this._providerReady = true
    return this._provider
  }
}
