/**
 * The context game's data model. The store behaves like a weight matrix:
 * entries carry a strength, reads are weighted, writes are small nudges
 * driven by a scored error. The player sees claims, never strengths.
 */

export type EntryKind =
  | 'episode' // raw, specific, new
  | 'rule' //    generalised, from a merge
  | 'warning' // situation → avoid an action

export interface SituationKey {
  features: Record<string, string | number | boolean>
  text?: string
}

export interface MemoryEntry {
  /** Stable and deterministic: the same kind, key and claim always give the same id. */
  id: string
  kind: EntryKind
  key: SituationKey
  claim: string
  strength: number
  reads: number
  gains: number
  pains: number
  createdDay: number
  lastReadDay: number
  parents: string[]
  distilled: boolean
  archived: boolean
}

/** One step's read: what the player was shown and what it then did. */
export interface ReadTrace {
  step: number
  situation: SituationKey
  /** Every entry read, with its share of the read. Shares sum to 1. */
  entries: Array<{ id: string; share: number }>
  action: string
}

/** What a player may suggest the store remember. Text only — no strength, no reward. */
export interface Proposal {
  key: SituationKey
  claim: string
  kind: EntryKind
}

export interface Score {
  reward: number
  pain: boolean
  gain: boolean
}

export interface EpisodeResult {
  episodeId: string
  day: number
  traces: ReadTrace[]
  score: Score
  proposals: Proposal[]
  moves: number
  shortest: number
  reached: boolean
}

export interface Rng {
  (): number
  int(n: number): number
  pick<T>(xs: T[]): T
}
