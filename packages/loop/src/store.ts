/**
 * The store: the context game's weight matrix, as a set of claims with
 * strengths, plus the running baseline of reward each situation has seen.
 *
 * Nothing changes the store except an event, and every event is chained to
 * the one before it by hash. That gives two properties worth having: the store
 * can be rebuilt from its record and checked against itself, and a record that
 * was edited after the fact no longer verifies.
 */
import { canonical, fingerprint } from './canonical'
import { keyText } from './key'
import { createHash } from 'crypto'
import type { EntryKind, MemoryEntry, SituationKey } from './types'

export interface EntrySet {
  id: string
  strength: number
  reads: number
  gains: number
  pains: number
  lastReadDay: number
}

export interface BaselineSet {
  key: string
  sum: number
  n: number
}

export type EventBody =
  | { type: 'episode'; episodeId: string; day: number; creates: MemoryEntry[]; sets: EntrySet[]; baselines: BaselineSet[] }
  | { type: 'day-end'; day: number; sets: EntrySet[]; rules: MemoryEntry[]; archive: string[] }

export interface StoreEvent {
  seq: number
  prev: string
  hash: string
  body: EventBody
}

const GENESIS = '0'.repeat(64)

export function entryId(kind: EntryKind, key: SituationKey, claim: string): string {
  return fingerprint({ kind, key: key.features, claim }).slice(0, 16)
}

function chain(prev: string, body: EventBody): string {
  return createHash('sha256').update(prev + canonical(body)).digest('hex')
}

export class Store {
  readonly entries = new Map<string, MemoryEntry>()
  readonly baselines = new Map<string, { sum: number; n: number }>()
  readonly log: StoreEvent[] = []

  get head(): string {
    return this.log.length ? this.log[this.log.length - 1]!.hash : GENESIS
  }

  /** The only way the store changes. */
  apply(body: EventBody): StoreEvent {
    const event: StoreEvent = { seq: this.log.length, prev: this.head, hash: chain(this.head, body), body }
    this.mutate(body)
    this.log.push(event)
    return event
  }

  /** What a situation is worth when the store says nothing; the overall mean until it has samples of its own. */
  baseline(key: SituationKey): number {
    const b = this.baselines.get(keyText(key))
    if (b && b.n > 0) return b.sum / b.n
    const all = this.baselines.get('*')
    return all && all.n > 0 ? all.sum / all.n : 0
  }

  active(): MemoryEntry[] {
    return [...this.entries.values()].filter((e) => !e.archived)
  }

  /** A fingerprint of what the store holds, independent of the order it was built in. */
  fingerprint(): string {
    const entries = [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id))
    const baselines = [...this.baselines.entries()].sort(([a], [b]) => a.localeCompare(b))
    return fingerprint({ entries, baselines })
  }

  /** Rebuild a store by replaying a record, checking that every link of the chain holds. */
  static rebuild(log: StoreEvent[]): Store {
    const store = new Store()
    for (const event of log) {
      if (event.seq !== store.log.length) throw new Error(`the record skips from ${store.log.length} to ${event.seq}`)
      if (event.prev !== store.head) throw new Error(`the record is broken at event ${event.seq}: it does not follow the one before it`)
      const replayed = store.apply(event.body)
      if (replayed.hash !== event.hash) throw new Error(`event ${event.seq} was altered after it was recorded`)
    }
    return store
  }

  private mutate(body: EventBody): void {
    if (body.type === 'day-end') {
      this.assign(body.sets)
      for (const rule of body.rules) this.entries.set(rule.id, { ...rule, parents: [...rule.parents] })
      for (const id of body.archive) {
        const entry = this.entries.get(id)
        if (!entry) throw new Error(`the record puts away ${id}, which the store never held`)
        entry.archived = true
      }
      return
    }
    for (const entry of body.creates) {
      if (!this.entries.has(entry.id)) this.entries.set(entry.id, { ...entry, parents: [...entry.parents] })
    }
    this.assign(body.sets)
    for (const b of body.baselines) this.baselines.set(b.key, { sum: b.sum, n: b.n })
  }

  private assign(sets: EntrySet[]): void {
    for (const set of sets) {
      const entry = this.entries.get(set.id)
      if (!entry) throw new Error(`the record sets ${set.id}, which the store never held`)
      entry.strength = set.strength
      entry.reads = set.reads
      entry.gains = set.gains
      entry.pains = set.pains
      entry.lastReadDay = set.lastReadDay
    }
  }
}
