/**
 * The read path — the context game's forward pass. A situation selects the
 * claims that are about it, ranks them by similarity times strength, packs the
 * best into a budget, and leaves a few slots for weaker claims so that a claim
 * which has never been tried is not shut out by one that merely got there
 * first.
 *
 * A rule is read only where its conditions hold; a claim about one situation
 * also reaches situations like it.
 *
 * The player is handed the claims, best first. It is never handed a strength:
 * a number it can see is a number it can argue with.
 */
import type { Config } from './config'
import { covers, type Similarity } from './key'
import type { Store } from './store'
import type { MemoryEntry, Rng, SituationKey } from './types'

export interface Read {
  /** What the player sees: claim text, best first. */
  claims: string[]
  /** What the engine keeps: which entries were read, and their share. */
  entries: Array<{ id: string; share: number; claim: string; sim: number }>
}

const tokens = (claim: string) => Math.max(1, Math.ceil(claim.length / 4))

export function read(store: Store, situation: SituationKey, rng: Rng, config: Config, sim: Similarity, hidden?: ReadonlySet<string>): Read {
  const candidates: Array<{ entry: MemoryEntry; sim: number; score: number }> = []
  for (const entry of store.active()) {
    if (hidden?.has(entry.id)) continue
    // A claim about one situation reaches the situations near it. A rule names
    // the conditions it holds under, and is not stretched past them: counting
    // what it leaves out as agreement would offer "large and new: refuse" to a
    // large request from a gold customer.
    const general = Object.keys(entry.key.features).length < Object.keys(situation.features).length
    if (general && !covers(entry.key, situation)) continue
    const s = sim(situation, entry.key)
    if (s >= config.SIM_MIN) candidates.push({ entry, sim: s, score: s * entry.strength })
  }
  candidates.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))

  // A claim held more weakly than when it was new has been refuted by what
  // happened. It is not advice; it only comes back through exploration.
  const trusted = candidates.filter((c) => c.entry.strength >= config.S_INIT)
  const doubted = candidates.filter((c) => c.entry.strength < config.S_INIT)

  const exploitBudget = config.TOKEN_BUDGET * (1 - config.EPS)
  const chosen: typeof candidates = []
  let used = 0
  let i = 0
  for (; i < trusted.length && chosen.length < config.TOP_K; i++) {
    const cost = tokens(trusted[i]!.entry.claim)
    if (used + cost > exploitBudget) break
    chosen.push(trusted[i]!)
    used += cost
  }

  // explore, now and then: one claim from what the ranking left behind, so a
  // claim that lost early can still be tried again and recover
  const rest = [...trusted.slice(i), ...doubted]
  if (rest.length > 0 && rng() < config.EPS) {
    const pick = rest[rng.int(rest.length)]!
    const cost = tokens(pick.entry.claim)
    if (used + cost <= config.TOKEN_BUDGET) {
      chosen.push(pick)
      used += cost
    }
  }

  const total = chosen.reduce((sum, c) => sum + c.score, 0)
  const entries = chosen.map((c) => ({
    id: c.entry.id,
    claim: c.entry.claim,
    sim: c.sim,
    share: total > 0 ? c.score / total : 1 / chosen.length,
  }))
  // reading changes nothing: when an entry was last read is recorded by the
  // write path, inside an event, so the store can still be rebuilt from its record
  return { claims: entries.map((e) => e.claim), entries }
}
