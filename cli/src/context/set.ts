import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
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
import { retrieve, type RetrievalContext, type RetrievalInternals } from './retrieve'
import { UsageStore, type UsageReceipt, type UsageReport } from './usage'
import { ProcedureSession, stepParts, treeIdFromRef, type ProcedureStep, type ProcedureStepOptions, type SupportPassage } from './procedure'
import { buildDapGraph } from '../dap/tree-builder'
import { getNodeTargets } from '../dap/tree-builder'
import type { DapGraph } from '../dap/types'
import { DEFAULT_BUDGET } from './options'
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
  private _usage: UsageStore | null
  private _dap: DapGraph | null = null

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
    this._usage = options.usage === false ? null : new UsageStore(join(root, '.dep-usage.json'))
  }

  /** Where the usage record lives, if one is kept. */
  get usagePath(): string | null {
    return this._usage?.path ?? null
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
    this._dap = null
    this.ensureLoaded()
  }

  async context(question: string, options: ContextOptions = {}): Promise<Bundle> {
    return this.assemble(question, options)
  }

  // ── usage record ──────────────────────────────────────────────────────

  /** Report which passages of a bundle were actually used. */
  recordUsage(bundleId: string, used: string[]): UsageReceipt {
    if (!this._usage) return { recorded: false, reason: 'this set keeps no usage record' }
    const bundle = this._usage.knows(bundleId)
    if (!bundle) {
      throw new DepError('UNKNOWN_BUNDLE', `bundle "${bundleId}" cannot be matched to a bundle this set produced`, { bundleId })
    }
    const offered = new Set(bundle.passages.map((p) => p.id))
    for (const id of used) {
      if (!offered.has(id)) {
        throw new DepError('UNKNOWN_PASSAGE', `passage "${id}" cannot be matched to a bundle this set produced`, { bundleId, passageId: id })
      }
    }
    return this._usage.record(bundleId, bundle, used)
  }

  usageReport(): UsageReport {
    if (!this._usage) return { version: 0, bundles: 0, passages: {}, passedOver: [] }
    return this._usage.report()
  }

  clearUsage(): { cleared: boolean; removed: number } {
    if (!this._usage) return { cleared: false, removed: 0 }
    return this._usage.clear()
  }

  // ── procedures ────────────────────────────────────────────────────────

  procedureSession(options: { budget: number }): ProcedureSession {
    if (typeof options.budget !== 'number' || !Number.isFinite(options.budget) || options.budget <= 0) {
      throw new DepError('INVALID_BUDGET', 'budget must be a positive number', { budget: options.budget })
    }
    return new ProcedureSession(options.budget)
  }

  /**
   * One step of a procedure, delivered whole, with the supporting knowledge
   * it needs packed to a budget — per step, or carried in a session.
   */
  async procedureStep(treeId: string, nodeId: string, options: ProcedureStepOptions = {}): Promise<ProcedureStep> {
    const dap = this.procedures()
    const tree = dap.trees.get(treeId)
    if (!tree) {
      throw new DepError('TREE_NOT_FOUND', `procedure "${treeId}" is not declared; declared procedures: ${[...dap.trees.keys()].join(', ') || '(none)'}`, { tree: treeId })
    }
    const node = tree.nodes.get(nodeId)
    if (!node) {
      throw new DepError('NODE_NOT_FOUND', `step "${nodeId}" is not declared by procedure "${treeId}"; declared steps: ${[...tree.nodes.keys()].join(', ')}`, { tree: treeId, step: nodeId })
    }
    const session = options.session ?? null
    const notices: Bundle['notices'] = []
    const parts = stepParts(node)
    const stepTokens = estimateTokens(parts.map((p) => p.text).join(' '))

    let declared: number
    let available: number
    if (session) {
      declared = session.declared
      available = session.remaining
    } else {
      declared = options.budget ?? DEFAULT_BUDGET
      if (typeof declared !== 'number' || !Number.isFinite(declared) || declared <= 0) {
        throw new DepError('INVALID_BUDGET', 'budget must be a positive number', { budget: declared })
      }
      available = declared - stepTokens
      if (available <= 0) {
        notices.push({ code: 'step-exceeds-budget', message: `the step alone (${stepTokens} tokens) exceeds the declared budget of ${declared}`, stepTokens })
        available = 0
      }
    }

    const passages: SupportPassage[] = []
    const alreadySupplied = new Map<string, ProcedureStep['support']['alreadySupplied'][number]>()
    const suppliedNow = new Set<string>()
    let used = 0
    let nothingFit = false
    for (const { part, text } of parts) {
      const remaining = available - used
      if (remaining < 1) break
      const exclude = new Set<string>([...(session?.supplied.keys() ?? []), ...suppliedNow])
      let bundle: Bundle
      try {
        bundle = await this.assemble(text, { budget: remaining, expand: false }, { exclude })
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        notices.push({ code: 'support-unavailable', message: `no supporting knowledge could be retrieved: ${reason}`, reason })
        break
      }
      if (bundle.notices.some((n) => n.code === 'nothing-fits')) nothingFit = true
      for (const p of bundle.passages) {
        passages.push({ ...p, supports: part })
        suppliedNow.add(p.id)
        used += p.tokens
        session?.supplied.set(p.id, { document: p.document, step: nodeId, tree: treeId })
      }
      for (const e of bundle.excluded) {
        const where = session?.supplied.get(e.id)
        if (!alreadySupplied.has(e.id)) {
          alreadySupplied.set(e.id, { id: e.id, document: e.document, step: where?.step ?? nodeId, tree: where?.tree ?? treeId })
        }
      }
    }
    if (session) {
      session.used += used
      if (passages.length === 0 && (session.remaining === 0 || nothingFit)) {
        notices.push({ code: 'budget-exhausted', message: "no further supporting knowledge can be supplied within the procedure's budget" })
      }
    }

    const handoff = node.delegate_to ? this.handoffTarget(dap, node.delegate_to) : null
    return {
      tree: treeId,
      step: { ...node, tokens: stepTokens },
      next: getNodeTargets(node),
      handoff,
      support: {
        passages,
        alreadySupplied: [...alreadySupplied.values()],
        budget: { declared, used, remaining: Math.max(0, (session ? session.declared : declared) - (session ? session.used : stepTokens + used)) },
      },
      session: session ? session.snapshot() : null,
      notices,
    }
  }

  private handoffTarget(dap: DapGraph, ref: string): ProcedureStep['handoff'] {
    const tree = treeIdFromRef(ref)
    const target = dap.trees.get(tree)
    return { tree, entry: target?.metadata.entry_node ?? '' }
  }

  private procedures(): DapGraph {
    if (this._dap) return this._dap
    const dapRoot = this.options.dapRoot ?? join(this.root, 'dap')
    if (!existsSync(join(dapRoot, '.dapspec'))) {
      throw new DepError('TREE_NOT_FOUND', `the project declares no procedures (${join(dapRoot, '.dapspec')} is missing)`, { dapRoot })
    }
    this._dap = buildDapGraph(dapRoot)
    return this._dap
  }

  private async assemble(question: string, options: ContextOptions, internals: RetrievalInternals = {}): Promise<Bundle> {
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

    const usage = this._usage
    const bundle = retrieve(question, normalized, {
      config: this._config,
      graph: this._graph!,
      titles: this._titles,
      now: this.now(),
      chunks,
      queryEmbedding,
      index,
      fileHashes: this._fileHashes,
      usage: usage ? { factor: (id, questionTerms) => usage.factor(id, questionTerms) } : null,
      usageVersion: usage ? usage.version : 0,
    }, internals)
    usage?.offer(bundle.id, { question, passages: bundle.passages.map((p) => ({ id: p.id, document: p.document })) })
    return bundle
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

  /**
   * Make the project bring its index up to date whenever a commit lands, by
   * installing a git post-commit hook. Returns where the hook was written.
   */
  installIndexHook(options: { command?: string } = {}): { path: string; command: string } {
    const gitDir = join(this.root, '.git')
    if (!existsSync(gitDir)) {
      throw new DepError('NOT_A_DIRECTORY', `${this.root} is not a git repository; there is nowhere to install a commit hook`, { root: this.root })
    }
    const command = options.command ?? defaultCliCommand()
    const hooksDir = join(gitDir, 'hooks')
    mkdirSync(hooksDir, { recursive: true })
    const path = join(hooksDir, 'post-commit')
    writeFileSync(path, [
      '#!/bin/sh',
      '# installed by dep — keeps the retrieval index in step with committed documents',
      `${command} vectorize --root . --json`,
      '',
    ].join('\n'))
    chmodSync(path, 0o755)
    return { path, command }
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

/** How to invoke this very CLI again from a hook: the binary, or bun plus the entry file. */
function defaultCliCommand(): string {
  const entry = process.argv[1] ?? ''
  if (entry.endsWith('.ts') || entry.endsWith('.js')) return `${JSON.stringify(process.execPath)} ${JSON.stringify(entry)}`
  return JSON.stringify(process.execPath)
}
