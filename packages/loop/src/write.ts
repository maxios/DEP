/**
 * The write path — the context game's gradient step, once per episode.
 *
 *   err = reward − baseline(situation)
 *   s  += LR × err × share          for each claim the player followed
 *
 * Two departures from the letter of the spec, both on purpose:
 *
 * Credit goes only to the claims the player followed. A claim that recommended
 * a move the player did not make had no part in the outcome; it is counted as
 * read and left alone. The trace records the action, which is what makes this
 * possible.
 *
 * A proposal counts as novel when no existing claim says the same thing about
 * a similar situation. Checking the situation alone would mean the first claim
 * about a crossroads shuts out every other way through it.
 *
 * The baseline is what a situation is worth when the store says nothing — it
 * is fed only by steps where the player followed no claim. A claim measured
 * against its own average competes with itself and drifts; measured against
 * playing without advice, it gains strength exactly when following it beats
 * not following it. A situation with no such steps yet borrows the mean of all
 * of them, so a new claim is not judged against zero.
 *
 * Everything the player hands over is reduced to its kind, key and claim text
 * before it touches the store. Anything else it attaches — a reward, a
 * strength, a verdict on itself — is not read, because there is no code here
 * that reads it.
 */
import type { Config } from './config'
import type { Similarity } from './key'
import { keyText } from './key'
import { entryId, type BaselineSet, type EntrySet, type Store } from './store'
import type { EntryKind, MemoryEntry, Proposal, ReadTrace, Score, SituationKey } from './types'

const KINDS: EntryKind[] = ['episode', 'rule', 'warning']

/** The baseline every situation falls back on before it has samples of its own. */
export const ALL = '*'

/** The action a claim recommends, if it is one this engine understands. */
export function claimAction(claim: string): string | null {
  const m = /^go ([NESW])$/.exec(claim)
  return m ? m[1]! : null
}

function cleanKey(key: unknown): SituationKey | null {
  if (!key || typeof key !== 'object') return null
  const features = (key as { features?: unknown }).features
  if (!features || typeof features !== 'object') return null
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(features as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return { features: out }
}

/** Reduce whatever the player sent to the three things a proposal may carry. */
function cleanProposal(raw: unknown): Proposal | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const kind = KINDS.includes(r.kind as EntryKind) ? (r.kind as EntryKind) : null
  const claim = typeof r.claim === 'string' && r.claim.length > 0 && r.claim.length <= 400 ? r.claim : null
  const key = cleanKey(r.key)
  if (!kind || !claim || !key) return null
  return { kind, claim, key }
}

export interface Written {
  created: number
  credited: number
}

export function write(
  store: Store,
  episode: { episodeId: string; day: number; traces: ReadTrace[]; score: Score; proposals: unknown[] },
  config: Config,
  sim: Similarity
): Written {
  const { day, traces, score } = episode
  const r = score.reward

  // every error in this episode is measured against the baselines as they stood before it
  const baselineBefore = (key: SituationKey) => store.baseline(key)
  const unadvised = new Map<string, SituationKey>()

  const work = new Map<string, EntrySet>()
  const touch = (id: string): EntrySet | null => {
    const existing = work.get(id)
    if (existing) return existing
    const entry = store.entries.get(id)
    if (!entry) return null
    const set: EntrySet = { id, strength: entry.strength, reads: entry.reads, gains: entry.gains, pains: entry.pains, lastReadDay: entry.lastReadDay }
    work.set(id, set)
    return set
  }

  let credited = 0
  for (const trace of traces) {
    const err = r - baselineBefore(trace.situation)

    for (const read of trace.entries) {
      const set = touch(read.id)
      if (!set) continue
      set.reads++
      set.lastReadDay = day
    }

    const followed = trace.entries.filter((e) => {
      const claim = store.entries.get(e.id)?.claim
      return claim !== undefined && claimAction(claim) === trace.action
    })
    if (followed.length === 0) unadvised.set(keyText(trace.situation), trace.situation)
    const total = followed.reduce((sum, e) => sum + e.share, 0)
    for (const e of followed) {
      // an absorbed claim is on its way out of context: evidence against it
      // still counts, so it leaves sooner when it misleads, but it never gains
      const absorbed = store.entries.get(e.id)?.distilled === true
      if (absorbed && err >= 0) continue
      const set = touch(e.id)
      if (!set) continue
      const share = total > 0 ? e.share / total : 1 / followed.length
      set.strength = Math.min(config.S_MAX, Math.max(0, set.strength + config.LR * err * share))
      if (score.gain) set.gains++
      if (score.pain) set.pains++
      credited++
    }
  }

  const creates: MemoryEntry[] = []
  const pending = new Set<string>()
  for (const raw of episode.proposals) {
    const p = cleanProposal(raw)
    if (!p) continue
    const err = r - baselineBefore(p.key)
    if (Math.abs(err) <= config.SURPRISE) continue
    const id = entryId(p.kind, p.key, p.claim)
    if (pending.has(id) || store.entries.has(id)) continue
    const covered = store.active().some((e) => e.claim === p.claim && sim(p.key, e.key) >= config.NOVEL)
    if (covered) continue
    pending.add(id)
    creates.push({
      id,
      kind: p.kind,
      key: p.key,
      claim: p.claim,
      strength: config.S_INIT,
      reads: 0,
      gains: 0,
      pains: 0,
      createdDay: day,
      lastReadDay: day,
      parents: [],
      distilled: false,
      archived: false,
    })
  }

  // one sample per unadvised situation per episode, so a long episode does not
  // outvote a short one — plus the running mean across all of them, kept under
  // a reserved key, which a situation with no samples of its own falls back on
  const baselines: BaselineSet[] = []
  for (const [text] of unadvised) {
    const before = store.baselines.get(text) ?? { sum: 0, n: 0 }
    baselines.push({ key: text, sum: before.sum + r, n: before.n + 1 })
  }
  if (unadvised.size > 0) {
    const all = store.baselines.get(ALL) ?? { sum: 0, n: 0 }
    baselines.push({ key: ALL, sum: all.sum + r, n: all.n + 1 })
  }

  store.apply({ type: 'episode', episodeId: episode.episodeId, day, creates, sets: [...work.values()], baselines })
  return { created: creates.length, credited }
}
