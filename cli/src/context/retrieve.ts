import type { DepGraph, DepNode, DocspecConfig } from '../types'
import { cosineSimilarity } from '../vectorstore/similarity'
import { computeFreshness, type Freshness } from './freshness'
import { inverseDocumentFrequency, keywordScore, terms, TOKEN_ESTIMATOR } from './tokens'
import type {
  Bundle, CandidateChunk, NormalizedOptions, Notice, Omitted, Passage, PassageReason, Withheld,
} from './types'

/** How strongly each relationship pulls a neighbouring document into a bundle. */
export const RELATIONSHIP_WEIGHT: Record<string, number> = {
  REQUIRES: 1.0,
  TEACHES: 0.8,
  EXPLAINS: 0.8,
  DECIDES: 0.6,
  USES: 0.5,
  NEXT: 0.3,
  INLINE: 0.15,
}
const DEPTH_DECAY = 0.85
const GRAPH_BOOST = 0.15
const SEMANTIC_WEIGHT = 0.7
const KEYWORD_WEIGHT = 0.3

export interface UsageSignal {
  /** Multiplier above 1 when the passage has proved useful for questions like this one. */
  factor(passageId: string, questionTerms: string[]): number
}

export interface RetrievalContext {
  config: DocspecConfig
  graph: DepGraph
  titles: Map<string, string>
  now: Date
  chunks: CandidateChunk[]
  queryEmbedding: Float32Array | null
  index: {
    present: boolean
    builtAt: string | null
    provider: string | null
    incomplete: boolean
    hashes: Map<string, string>
    /** Documents the index holds that are no longer on disk. */
    missing: string[]
  }
  fileHashes: Map<string, string>
  usage: UsageSignal | null
  usageVersion: number
}

interface Candidate {
  chunk: CandidateChunk
  id: string
  score: number
  signals: Passage['signals']
  reason: PassageReason
  depth: number
}

export function passageId(document: string, section: string, content: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(`${document}\n${section}\n${content}`)
  return hasher.digest('hex').slice(0, 16)
}

export interface RetrievalInternals {
  /** Passage ids to leave out (already supplied elsewhere); they are reported, not served. */
  exclude?: Set<string>
}

export function retrieve(question: string, options: NormalizedOptions, ctx: RetrievalContext, internals: RetrievalInternals = {}): Bundle {
  const notices: Notice[] = []
  const exclude = internals.exclude ?? new Set<string>()
  const excluded: Bundle['excluded'] = []
  const withheld: Withheld[] = []
  const omitted: Omitted[] = []
  const questionTerms = terms(question)
  const ranking: Bundle['ranking'] = ctx.index.present && ctx.queryEmbedding ? 'hybrid' : 'keyword-only'

  // ── restrictions: applied to the whole field before anything is ranked ──
  const allowed = new Map<string, DepNode>()
  for (const [path, node] of ctx.graph.nodes) {
    if (isAllowed(node, options)) allowed.set(path, node)
  }

  // ── base relevance for every chunk of every allowed document ──
  const byDocument = new Map<string, Candidate[]>()
  const requiresInDegree = new Map<string, number>()
  for (const node of allowed.values()) {
    for (const edge of node.backlinks) if (edge.rel === 'REQUIRES') {
      requiresInDegree.set(node.path, (requiresInDegree.get(node.path) ?? 0) + 1)
    }
  }

  const idf = inverseDocumentFrequency(ctx.chunks.map((c) => c.content))
  const scored: Candidate[] = []
  for (const chunk of ctx.chunks) {
    const node = allowed.get(chunk.document)
    if (!node) continue
    const title = ctx.titles.get(chunk.document) ?? ''
    const keyword = keywordScore(questionTerms, chunk.content, title, node.metadata.tags ?? [], idf)
    let semantic: number | null = null
    if (ranking === 'hybrid' && chunk.embedding) {
      semantic = Math.max(0, cosineSimilarity(ctx.queryEmbedding!, chunk.embedding))
    }
    const base = semantic === null ? keyword : SEMANTIC_WEIGHT * semantic + KEYWORD_WEIGHT * keyword
    const graph = 1 + GRAPH_BOOST * Math.log(1 + (requiresInDegree.get(chunk.document) ?? 0))
    const id = passageId(chunk.document, chunk.section, chunk.content)
    const usage = ctx.usage ? ctx.usage.factor(id, questionTerms) : 1
    const candidate: Candidate = {
      chunk,
      id,
      score: base * graph * usage,
      signals: { semantic, keyword, graph, usage },
      reason: { kind: 'match' },
      depth: 0,
    }
    scored.push(candidate)
    if (!byDocument.has(chunk.document)) byDocument.set(chunk.document, [])
    byDocument.get(chunk.document)!.push(candidate)
  }

  // ── seeds: what matched the question well enough ──
  const candidates = new Map<string, Candidate[]>()
  for (const c of scored) {
    if (c.score > options.minScore) {
      if (exclude.has(c.id)) {
        excluded.push({ id: c.id, document: c.chunk.document, section: c.chunk.section })
        continue
      }
      if (!candidates.has(c.chunk.document)) candidates.set(c.chunk.document, [])
      candidates.get(c.chunk.document)!.push(c)
    }
  }
  const seedDocuments = [...candidates.keys()]

  // ── expansion along typed relationships ──
  const requires = new Map<string, Set<string>>() // document → documents it requires (within the field)
  if (options.expand && seedDocuments.length > 0) {
    expand(seedDocuments, candidates, byDocument, requires, allowed, ctx, options, notices, exclude)
  }
  for (const document of candidates.keys()) {
    const node = ctx.graph.nodes.get(document)
    if (!node) continue
    for (const edge of node.forwardLinks) {
      if (edge.rel === 'REQUIRES' && candidates.has(edge.target)) {
        if (!requires.has(document)) requires.set(document, new Set())
        requires.get(document)!.add(edge.target)
      }
    }
  }
  reportRequirementCycles(requires, notices)

  // ── freshness policy ──
  const freshnessByDocument = new Map<string, Freshness>()
  const missingCadenceTypes = new Set<string>()
  for (const document of [...candidates.keys()]) {
    const node = ctx.graph.nodes.get(document)!
    const freshness = computeFreshness(node.metadata, ctx.config, ctx.now)
    freshnessByDocument.set(document, freshness)
    if (freshness.futureDated) {
      notices.push({ code: 'future-verified', message: `${document} declares a verification date later than today; it is treated as verified now`, document })
    }
    if (freshness.cadenceMissing) missingCadenceTypes.add(node.metadata.type)

    const chunksHere = candidates.get(document)!
    const requiredByServed = chunksHere.some((c) => c.reason.kind === 'required-by')
    const keep =
      freshness.state === 'fresh' || freshness.state === 'unknown' ||
      (freshness.state === 'aging' && options.freshness !== 'fresh-only') ||
      (freshness.state === 'stale' && (options.freshness === 'include-stale' || requiredByServed))
    if (!keep) {
      for (const c of chunksHere) {
        withheld.push({ document, section: c.chunk.section, reason: freshness.state === 'stale' ? 'stale' : 'aging', lastVerified: freshness.lastVerified })
      }
      candidates.delete(document)
    }
  }
  for (const type of missingCadenceTypes) {
    notices.push({ code: 'missing-cadence', message: `no review cadence is declared for type "${type}"; its documents have unknown freshness`, type })
  }
  if (withheld.length > 0) {
    const documents = [...new Set(withheld.map((w) => w.document))]
    notices.push({
      code: 'withheld-stale',
      message: `${documents.length} matching document(s) withheld for being past the review date`,
      documents,
    })
    if (candidates.size === 0) {
      const latest = withheld.map((w) => w.lastVerified).filter(Boolean).sort().pop() ?? null
      notices.push({ code: 'all-stale', message: 'matches exist but all of them have expired', latestVerified: latest })
    }
  }

  if (allowed.size === 0) {
    notices.push({ code: 'restriction-excluded-all', message: 'the restriction excluded every document in the set' })
  } else if (seedDocuments.length === 0) {
    notices.push({ code: 'no-match', message: 'nothing in the set is about this question' })
  }

  // ── pack to the budget ──
  const pool = [...candidates.values()].flat().sort(compareCandidates)
  const selected = new Set<Candidate>()
  let used = 0
  const bestPerDocument = new Map<string, Candidate>()
  for (const c of pool) if (!bestPerDocument.has(c.chunk.document)) bestPerDocument.set(c.chunk.document, c)

  const prerequisitesOf = (document: string, seen = new Set<string>()): Candidate[] => {
    const out: Candidate[] = []
    for (const required of requires.get(document) ?? []) {
      if (seen.has(required)) continue
      seen.add(required)
      const best = bestPerDocument.get(required)
      if (!best) continue
      out.push(...prerequisitesOf(required, seen), best)
    }
    return out
  }

  const truncated = new Map<Candidate, string>() // left-out prerequisite → what needed it
  for (const c of pool) {
    if (selected.has(c)) continue
    const group = prerequisitesOf(c.chunk.document).filter((p) => !selected.has(p))
    const groupTokens = group.reduce((s, p) => s + p.chunk.tokens, 0) + c.chunk.tokens
    if (used + groupTokens <= options.budget) {
      for (const p of group) { selected.add(p); used += p.chunk.tokens }
      selected.add(c)
      used += c.chunk.tokens
    } else if (used + c.chunk.tokens <= options.budget) {
      selected.add(c)
      used += c.chunk.tokens
      for (const p of group) if (!truncated.has(p)) truncated.set(p, c.chunk.document)
    }
  }
  for (const c of pool) {
    if (selected.has(c)) continue
    const requiredBy = truncated.get(c)
    omitted.push({
      document: c.chunk.document,
      section: c.chunk.section,
      tokens: c.chunk.tokens,
      reason: requiredBy ? 'chain-truncated' : 'budget',
      ...(requiredBy ? { requiredBy } : {}),
    })
  }
  const chainLeftOut = omitted.filter((o) => o.reason === 'chain-truncated')
  if (chainLeftOut.length > 0) {
    notices.push({
      code: 'chain-truncated',
      message: 'the prerequisite chain did not fit within the budget',
      omitted: chainLeftOut.map((o) => o.document),
    })
  }
  if (selected.size === 0 && pool.length > 0) {
    const smallest = Math.min(...pool.map((c) => c.chunk.tokens))
    notices.push({
      code: 'nothing-fits',
      message: `no passage fits within a budget of ${options.budget} tokens; the smallest budget that would return something is ${smallest}`,
      smallestBudget: smallest,
    })
  }

  // ── reading order: most useful first, prerequisites ahead of what needs them ──
  const ordered: Candidate[] = []
  const emitted = new Set<Candidate>()
  const emit = (c: Candidate, stack = new Set<string>()) => {
    if (emitted.has(c)) return
    stack.add(c.chunk.document)
    for (const required of requires.get(c.chunk.document) ?? []) {
      if (stack.has(required)) continue
      for (const p of [...selected].filter((s) => s.chunk.document === required).sort(compareCandidates)) emit(p, stack)
    }
    stack.delete(c.chunk.document)
    emitted.add(c)
    ordered.push(c)
  }
  for (const c of [...selected].sort(compareCandidates)) emit(c)

  // ── provenance ──
  const outOfSync = new Set<string>()
  const passages: Passage[] = ordered.map((c) => {
    const node = ctx.graph.nodes.get(c.chunk.document)!
    const freshness = freshnessByDocument.get(c.chunk.document)!
    const indexedHash = ctx.index.hashes.get(c.chunk.document)
    const stale = ctx.index.present && indexedHash !== undefined && indexedHash !== ctx.fileHashes.get(c.chunk.document)
    if (stale) outOfSync.add(c.chunk.document)
    return {
      id: c.id,
      document: c.chunk.document,
      section: c.chunk.section,
      title: ctx.titles.get(c.chunk.document) ?? c.chunk.document,
      type: node.metadata.type,
      audience: node.metadata.audience ?? [],
      tags: node.metadata.tags ?? [],
      owner: node.metadata.owner
        ? { id: node.metadata.owner, inherited: false }
        : { id: ctx.config.governance?.fallback_owner ?? '', inherited: true },
      confidence: node.metadata.confidence,
      content: c.chunk.content,
      tokens: c.chunk.tokens,
      score: round(c.score),
      signals: {
        semantic: c.signals.semantic === null ? null : round(c.signals.semantic),
        keyword: round(c.signals.keyword),
        graph: round(c.signals.graph),
        usage: round(c.signals.usage),
      },
      reason: c.reason,
      freshness: describeFreshness(freshness, c.reason),
      outOfSync: stale,
    }
  })
  if (outOfSync.size > 0) {
    notices.push({
      code: 'index-out-of-sync',
      message: `${outOfSync.size} document(s) changed after the index was built`,
      documents: [...outOfSync],
      hint: 'run `dep vectorize` to bring the index up to date',
    })
  }
  if (ctx.index.missing.length > 0) {
    notices.push({
      code: 'index-behind',
      message: 'the index holds documents that no longer exist; it is behind the documentation set',
      documents: ctx.index.missing,
      hint: 'run `dep vectorize` to bring the index up to date',
    })
  }
  if (ranking === 'keyword-only') {
    notices.push({
      code: 'keyword-only',
      message: 'assembled without meaning-based ranking: the set has no index',
      hint: 'run `dep vectorize` to build the index',
    })
  }
  if (ctx.index.incomplete) {
    notices.push({ code: 'index-incomplete', message: 'the last index update did not finish; run `dep vectorize` again to resume' })
  }

  const bundle: Bundle = {
    id: '',
    question,
    ranking,
    budget: { declared: options.budget, used, remaining: options.budget - used, unit: 'tokens', estimator: TOKEN_ESTIMATOR },
    considered: allowed.size,
    reached: {
      matched: passages.filter((p) => p.reason.kind === 'match').length,
      expanded: passages.filter((p) => p.reason.kind !== 'match').length,
    },
    passages,
    withheld,
    omitted,
    excluded,
    notices,
    index: { present: ctx.index.present, builtAt: ctx.index.builtAt, provider: ctx.index.provider, incomplete: ctx.index.incomplete },
    usageRecordVersion: ctx.usageVersion,
  }
  bundle.id = bundleId(bundle, options)
  return bundle
}

function isAllowed(node: DepNode, options: NormalizedOptions): boolean {
  const meta = node.metadata
  if (options.audience && !(meta.audience ?? []).includes(options.audience)) return false
  if (options.type && meta.type !== options.type) return false
  if (options.tags.length > 0) {
    const tags = meta.tags ?? []
    if (!options.tags.every((t) => tags.includes(t))) return false
  }
  if (options.within !== undefined) {
    if (!(node.path === options.within || node.path.startsWith(options.within + '/'))) return false
  }
  return true
}

function expand(
  seeds: string[],
  candidates: Map<string, Candidate[]>,
  byDocument: Map<string, Candidate[]>,
  requires: Map<string, Set<string>>,
  allowed: Map<string, DepNode>,
  ctx: RetrievalContext,
  options: NormalizedOptions,
  notices: Notice[],
  exclude: Set<string>
) {
  const bestScore = (document: string) => Math.max(...(candidates.get(document) ?? []).map((c) => c.score))
  const queue: Array<{ document: string; depth: number }> = seeds.map((document) => ({ document, depth: 0 }))
  const visited = new Set(seeds)
  const reportedMissing = new Set<string>()

  while (queue.length > 0) {
    const { document, depth } = queue.shift()!
    if (depth >= options.depth) continue
    const node = ctx.graph.nodes.get(document)
    if (!node) continue
    const parentScore = bestScore(document)

    for (const edge of node.forwardLinks) {
      const target = edge.target
      if (!ctx.graph.nodes.has(target)) {
        if (edge.rel === 'REQUIRES' && !reportedMissing.has(target)) {
          reportedMissing.add(target)
          notices.push({ code: 'missing-prerequisite', message: `${document} requires ${target}, which could not be found`, document, required: target })
        }
        continue
      }
      if (!allowed.has(target)) continue
      if (edge.rel === 'REQUIRES') {
        if (!requires.has(document)) requires.set(document, new Set())
        requires.get(document)!.add(target)
      }
      if (candidates.has(target)) continue
      if (visited.has(target)) continue
      visited.add(target)

      const weight = RELATIONSHIP_WEIGHT[edge.rel] ?? 0.3
      const pool = (byDocument.get(target) ?? []).filter((c) => !exclude.has(c.id))
      const representative = [...pool].sort((a, b) => b.score - a.score || a.chunk.chunkIndex - b.chunk.chunkIndex)[0]
      if (!representative) continue
      const score = parentScore * weight * Math.pow(DEPTH_DECAY, depth)
      const pulled: Candidate = {
        ...representative,
        score,
        reason: edge.rel === 'REQUIRES'
          ? { kind: 'required-by', via: document, rel: edge.rel }
          : { kind: 'expanded-from', via: document, rel: edge.rel },
        depth: depth + 1,
      }
      candidates.set(target, [pulled])
      queue.push({ document: target, depth: depth + 1 })
    }
  }
}

function reportRequirementCycles(requires: Map<string, Set<string>>, notices: Notice[]) {
  const visiting = new Set<string>()
  const done = new Set<string>()
  const cycles: string[][] = []
  const walk = (document: string, path: string[]) => {
    if (visiting.has(document)) {
      cycles.push([...path.slice(path.indexOf(document)), document])
      return
    }
    if (done.has(document)) return
    visiting.add(document)
    for (const next of requires.get(document) ?? []) walk(next, [...path, document])
    visiting.delete(document)
    done.add(document)
  }
  for (const document of requires.keys()) walk(document, [])
  if (cycles.length > 0) {
    notices.push({ code: 'requirement-cycle', message: 'the requirement chain closes on itself', cycles })
  }
}

function describeFreshness(f: Freshness, reason: PassageReason): Passage['freshness'] {
  let note: string | undefined
  if (f.state === 'aging') note = 'approaching its review date'
  if (f.state === 'stale') {
    note = reason.kind === 'required-by'
      ? `past its review date; included because a served passage requires it (${reason.via})`
      : 'past its review date'
  }
  if (f.state === 'unknown') note = f.cadenceMissing ? 'no review cadence declared for its type' : 'no usable verification date'
  if (f.futureDated) note = 'verification date is later than today; treated as verified now'
  return { state: f.state, lastVerified: f.lastVerified, cadenceDays: f.cadenceDays, ...(note ? { note } : {}) }
}

function compareCandidates(a: Candidate, b: Candidate): number {
  return b.score - a.score
    || a.chunk.document.localeCompare(b.chunk.document)
    || a.chunk.chunkIndex - b.chunk.chunkIndex
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000
}

function bundleId(bundle: Bundle, options: NormalizedOptions): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(JSON.stringify({
    question: bundle.question,
    options,
    index: bundle.index,
    usage: bundle.usageRecordVersion,
    passages: bundle.passages.map((p) => p.id),
  }))
  return hasher.digest('hex').slice(0, 16)
}
