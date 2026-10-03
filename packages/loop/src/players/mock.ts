/**
 * A deterministic player. It follows the best claim it was shown that it can
 * act on; now and then, and whenever no claim applies, it explores — preferring
 * cells it has not stood on this run, the way the maze core's scratch does.
 *
 * When it reaches the goal it proposes the path it actually needed (the trail
 * with its loops erased) as claims about the situations along it. Proposals are
 * text. Whether any of them is worth keeping is not the player's call.
 *
 * Scratch lives in the player and dies with the run: "I have been here" is a
 * fact about this run, not about the place, and it never reaches the store.
 */
import type { Rng, SituationKey } from '../types'
import { claimAction } from '../write'

export interface PlayerView {
  key: SituationKey
  /** Directions that are not walled. */
  open: string[]
  /** The cell this player is in, for its own scratch. */
  cell: string
  /** The cell each open direction leads to. */
  next: Record<string, string>
  from: string
}

export interface Player {
  startEpisode(): void
  act(view: PlayerView, claims: string[], rng: Rng): { action: string; [extra: string]: unknown }
  endEpisode(reached: boolean): unknown[]
}

export class MockPlayer implements Player {
  private visits = new Map<string, number>()
  private trail: Array<{ cell: string; key: SituationKey; action: string }> = []

  constructor(private readonly explore: number = 0.1) {}

  startEpisode(): void {
    this.visits = new Map()
    this.trail = []
  }

  act(view: PlayerView, claims: string[], rng: Rng): { action: string } {
    this.visits.set(view.cell, (this.visits.get(view.cell) ?? 0) + 1)
    // A claim is about a kind of situation, not a place, so it cannot know this
    // run has already been through here. Followed blindly it walks the same loop
    // until the move cap. The best claim worth following is the best one that
    // leads somewhere this run has not been.
    const applicable = claims.map(claimAction).filter((d): d is string => d !== null && view.open.includes(d))
    const fresh = applicable.filter((d) => !this.visits.has(view.next[d]!))
    const roll = rng()
    let action: string
    if (fresh.length > 0 && roll >= this.explore) {
      action = fresh[0]!
    } else {
      action = this.wander(view, rng)
    }
    this.trail.push({ cell: view.cell, key: view.key, action })
    return { action }
  }

  endEpisode(reached: boolean): unknown[] {
    if (!reached) return []
    return loopErased(this.trail).map((step) => ({ kind: 'episode', key: step.key, claim: `go ${step.action}` }))
  }

  private wander(view: PlayerView, rng: Rng): string {
    const fresh = view.open.filter((d) => !this.visits.has(view.next[d]!))
    if (fresh.length > 0) return rng.pick(fresh)
    const forward = view.open.filter((d) => d !== view.from)
    if (forward.length > 0) return rng.pick(forward)
    return rng.pick(view.open)
  }
}

/** The trail with every loop removed: the path the run actually needed. */
export function loopErased<T extends { cell: string }>(trail: T[]): T[] {
  const path: T[] = []
  const at = new Map<string, number>()
  for (const step of trail) {
    const seen = at.get(step.cell)
    if (seen !== undefined) {
      for (const dropped of path.splice(seen)) at.delete(dropped.cell)
    }
    at.set(step.cell, path.length)
    path.push(step)
  }
  return path
}
