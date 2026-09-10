import type { EmbeddingProvider } from '../embeddings/provider'

export type FreshnessPreference = 'withhold-stale' | 'include-stale' | 'fresh-only'
export const FRESHNESS_PREFERENCES: FreshnessPreference[] = ['withhold-stale', 'include-stale', 'fresh-only']

export type FreshnessState = 'fresh' | 'aging' | 'stale' | 'unknown'

export interface ContextOptions {
  /** Ceiling on the bundle size, in tokens. Never a target. */
  budget?: number
  /** Only documents written for this audience id. */
  audience?: string
  /** Only documents of this type. */
  type?: string
  /** Only documents carrying every one of these tags. */
  tags?: string[]
  /** Only documents under this path (relative to the project root). */
  within?: string
  freshness?: FreshnessPreference
  /** How many relationships deep expansion may reach. 0 disables it. */
  depth?: number
  expand?: boolean
  /** Passages scoring below this are left out even when the budget could hold them. */
  minScore?: number
  /** Provenance is part of every bundle; passing `false` is refused. */
  provenance?: boolean
}

export interface NormalizedOptions {
  budget: number
  audience?: string
  type?: string
  tags: string[]
  within?: string
  freshness: FreshnessPreference
  depth: number
  expand: boolean
  minScore: number
}

export interface PassageReason {
  kind: 'match' | 'required-by' | 'expanded-from'
  /** The document this passage was pulled in for, when not a direct match. */
  via?: string
  rel?: string
}

export interface PassageFreshness {
  state: FreshnessState
  lastVerified: string | null
  cadenceDays: number | null
  note?: string
}

export interface Passage {
  /** Stable identity: a digest of document, section and content. Survives a rebuild. */
  id: string
  document: string
  section: string
  title: string
  type: string
  audience: string[]
  tags: string[]
  owner: { id: string; inherited: boolean }
  confidence: string
  content: string
  tokens: number
  score: number
  signals: { semantic: number | null; keyword: number; graph: number; usage: number }
  reason: PassageReason
  freshness: PassageFreshness
  /** The document changed after the index was built; the passage may not match the file. */
  outOfSync: boolean
}

export interface Withheld {
  document: string
  section: string
  reason: 'stale' | 'aging'
  lastVerified: string | null
}

export interface Omitted {
  document: string
  section: string
  tokens: number
  reason: 'budget' | 'chain-truncated'
  requiredBy?: string
}

export interface Notice {
  code: string
  message: string
  [key: string]: unknown
}

export interface Bundle {
  /** Deterministic for the same question, options, index and usage record. */
  id: string
  question: string
  ranking: 'hybrid' | 'keyword-only'
  budget: { declared: number; used: number; remaining: number; unit: 'tokens'; estimator: string }
  /** Documents that survived the restrictions and were scored. */
  considered: number
  /** How passages got in: by matching the question, or by expansion from a match. */
  reached: { matched: number; expanded: number }
  passages: Passage[]
  withheld: Withheld[]
  omitted: Omitted[]
  notices: Notice[]
  index: { present: boolean; builtAt: string | null; provider: string | null; incomplete: boolean }
  usageRecordVersion: number
}

export interface IndexOptions {
  force?: boolean
  /** Confine the update to one document. */
  only?: string
  signal?: AbortSignal
  onProgress?: (document: string) => void
}

export interface IndexReport {
  processed: string[]
  reused: string[]
  removed: string[]
  unreadable: string[]
  chunks: number
  provider: string
  builtAt: string | null
  incomplete: boolean
}

export interface OpenOptions {
  embeddings?: EmbeddingProvider
  now?: () => Date
  dapRoot?: string
}

export interface CandidateChunk {
  document: string
  chunkIndex: number
  section: string
  content: string
  tokens: number
  embedding: Float32Array | null
}

export interface SearchOptions {
  audience?: string
  type?: string
  tags?: string[]
  within?: string
  freshness?: FreshnessPreference
  limit?: number
}

export interface SearchResults {
  query: string
  ranking: 'hybrid' | 'keyword-only'
  considered: number
  results: Array<{ document: string; title: string; section: string; score: number; snippet: string; freshness: PassageFreshness }>
}

export interface DocumentMetadata {
  path: string
  title: string
  declared: Record<string, unknown>
  lifecycle: 'FRESH' | 'AGING' | 'STALE'
  freshness: { state: FreshnessState; lastVerified: string | null; cadenceDays: number | null }
  links: Array<{ target: string; rel: string }>
  backlinks: Array<{ source: string; rel: string }>
}
