/**
 * The player's instincts — the context game's slow memory, standing in for a
 * LoRA adapter. An instinct is an action the player takes in a situation
 * without being told, the way a trained model behaves without the prompt
 * saying so.
 *
 * Versions are immutable. A night either adopts a new version or leaves the
 * current one in place, so undoing a bad night is pointing back, never repair.
 * The player consults instincts only after the claims in its context: what it
 * is told in the moment overrides what it does by habit.
 */
import { fingerprint } from './canonical'
import { covers } from './key'
import type { SituationKey } from './types'

export interface Instinct {
  key: SituationKey
  action: string
  /** The store entry this instinct was taught from. */
  from: string
}

export interface Adapter {
  version: number
  parent: number | null
  instincts: Instinct[]
  hash: string
}

/** One night's teaching material, kept so later nights can replay it. */
export interface SftExample {
  /** The situation as the player saw it — and nothing the store holds. */
  situation: string
  key: SituationKey
  action: string
}

export class Instincts {
  private readonly versions = new Map<number, Adapter>()
  private currentVersion = 0
  /** Every night's examples, oldest first — the replay pool. */
  readonly nights: SftExample[][] = []

  static start(): Instincts {
    const registry = new Instincts()
    registry.versions.set(0, Instincts.version(0, null, []))
    return registry
  }

  /** Build an immutable version. Instincts are ordered so the hash depends only on content. */
  static version(version: number, parent: number | null, instincts: Instinct[]): Adapter {
    const sorted = [...instincts].sort((a, b) => a.from.localeCompare(b.from) || a.action.localeCompare(b.action))
    return { version, parent, instincts: sorted, hash: fingerprint({ version, parent, instincts: sorted }) }
  }

  current(): Adapter {
    return this.versions.get(this.currentVersion)!
  }

  get(version: number): Adapter {
    const found = this.versions.get(version)
    if (!found) throw new Error(`no version ${version} of the instincts exists`)
    return found
  }

  next(): number {
    return Math.max(...this.versions.keys()) + 1
  }

  adopt(adapter: Adapter): void {
    this.versions.set(adapter.version, adapter)
    this.currentVersion = adapter.version
  }

  list(): Adapter[] {
    return [...this.versions.values()].sort((a, b) => a.version - b.version)
  }
}

/** The action an adapter takes in a situation: the most specific instinct that covers it. */
export function instinctFor(adapter: Adapter, situation: SituationKey): string | null {
  let best: { instinct: Instinct; specificity: number } | null = null
  for (const instinct of adapter.instincts) {
    if (!covers(instinct.key, situation)) continue
    const specificity = Object.keys(instinct.key.features).length
    if (!best || specificity > best.specificity || (specificity === best.specificity && instinct.from < best.instinct.from)) {
      best = { instinct, specificity }
    }
  }
  return best ? best.instinct.action : null
}
