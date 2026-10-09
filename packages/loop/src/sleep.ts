/**
 * The night — context-game sleep. Claims that have proved themselves are moved
 * out of context and into the player's instincts, and only when doing so is
 * safe:
 *
 *   gate      sleep on a day only if the player was competent and not getting
 *             worse (rule 6: listen down only while below is converging)
 *   select    claims that are strong, well tested, and usually acted on in
 *             episodes that went well
 *   teach     examples of what the player did in situations those claims
 *             covered — the situation only, never the claim, so the instinct
 *             has to stand without it
 *   absorb    a claim counts as absorbed only if the new instincts take the
 *             same action it recommends wherever it applies, on mazes the night
 *             was not taught from
 *   check     undo the night if the new instincts contradict the claims they
 *             were taught, or if the player, with the absorbed claims gone from
 *             its context, does worse on held-out mazes than before
 *
 * Nothing here judges itself. The verdict on the night comes from the same
 * Scorer as every day, on mazes played fresh for the purpose.
 */
import { instinctFor, Instincts, type Adapter, type Instinct, type Reach, type SftExample } from './adapter'
import { deriveSeed } from './canonical'
import { configWith, type Config } from './config'
import type { DayResult } from './day'
import { playEpisode } from './env/maze'
import { keyText, mazeBearingSimilarity, mazeSimilarity, type MazeKeying, type Similarity } from './key'
import { MockPlayer } from './players/mock'
import type { Store } from './store'
import type { MemoryEntry, SituationKey } from './types'
import { loadCore, type MazeCore } from './vendor/core'
import { claimAction } from './write'

export interface PreferencePair {
  situation: string
  chosen: string
  rejected: string
}

export interface Dataset {
  night: number
  sft: SftExample[]
  pairs: PreferencePair[]
  replay: SftExample[]
}

export interface TrainJob {
  from: Adapter
  dataset: Dataset
  /** The claims the night is teaching — each has examples in the dataset. */
  taught: MemoryEntry[]
  version: number
  /**
   * Which claim prompted the action in each taught situation. Bookkeeping for
   * the engine, never shown to the trainer as training material.
   */
  provenance: ReadonlyMap<string, string>
}

export interface Trainer {
  train(job: TrainJob): Adapter
}

/**
 * Stands in for a LoRA trainer. Like one, it learns from the examples, not from
 * the claims: in each situation it was shown, it takes up the action the
 * examples took most often. A claim advised wherever its situation was similar
 * enough, so the examples span every situation it actually steered — keying
 * instincts to the claim's own key instead covers a fraction of that, and the
 * player falls apart when the claims leave (measured: 0.172 → −0.235).
 */
export class MockTrainer implements Trainer {
  train(job: TrainJob): Adapter {
    const instincts = new Map<string, Instinct>()
    for (const i of job.from.instincts) instincts.set(keyText(i.key), i)
    const votes = new Map<string, { key: SituationKey; counts: Map<string, number> }>()
    for (const example of [...job.dataset.sft, ...job.dataset.replay]) {
      const v = votes.get(example.situation) ?? { key: example.key, counts: new Map() }
      v.counts.set(example.action, (v.counts.get(example.action) ?? 0) + 1)
      votes.set(example.situation, v)
    }
    for (const [situation, v] of [...votes].sort(([a], [b]) => a.localeCompare(b))) {
      const [action] = [...v.counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!
      const from = job.provenance.get(`${situation}|${action}`) ?? instincts.get(situation)?.from ?? 'replay'
      instincts.set(situation, { key: v.key, action, from })
    }
    return Instincts.version(job.version, job.from.version, [...instincts.values()])
  }
}

/**
 * How a night tries its work out: playing levels the day never saw. With
 * `alone`, the player is shown no claims and the instincts are judged by
 * themselves; `hidden` claims are treated as already gone from context.
 */
export interface HeldOut {
  /** How far instincts reach in this environment — the night must judge with the same reach. */
  reach?: Reach
  play(o: { instincts: Adapter; hidden: ReadonlySet<string>; alone?: boolean }): {
    reward: number
    followed: Array<{ id: string; situation: SituationKey; action: string }>
  }
}

/** A day as a night sees it — whatever the game was. */
export interface PlayedDay {
  day: number
  episodes: Array<{ pain: boolean; reward: number }>
  record: DayResult['record']
}

export interface GateVerdict {
  open: boolean
  reason: string
  painEarly: number
  painLate: number
  rewardVariance: number
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const pct = (x: number) => `${Math.round(x * 100)}%`

/** Was the day one worth learning from? Competent, and not getting worse. */
export function gate(day: Pick<PlayedDay, 'episodes'>, config: Config): GateVerdict {
  const k = Math.max(1, Math.min(config.K, Math.floor(day.episodes.length / 2)))
  const early = day.episodes.slice(0, k)
  const late = day.episodes.slice(-k)
  const painEarly = mean(early.map((e) => (e.pain ? 1 : 0)))
  const painLate = mean(late.map((e) => (e.pain ? 1 : 0)))
  const rewards = late.map((e) => e.reward)
  const m = mean(rewards)
  const rewardVariance = mean(rewards.map((r) => (r - m) ** 2))
  const verdict = (open: boolean, reason: string): GateVerdict => ({ open, reason, painEarly, painLate, rewardVariance })
  if (painLate > config.GATE_PAIN) {
    return verdict(false, `late in the day it fell short ${pct(painLate)} of the time; the gate allows ${pct(config.GATE_PAIN)}`)
  }
  if (painLate - painEarly > config.GATE_DRIFT) {
    return verdict(false, `it got worse through the day: fell short ${pct(painEarly)} of the time early and ${pct(painLate)} late`)
  }
  if (rewardVariance >= config.GATE_VAR) {
    return verdict(false, `its results swung too widely to learn from (variance ${rewardVariance.toFixed(2)})`)
  }
  return verdict(true, `competent and steady: fell short ${pct(painEarly)} early, ${pct(painLate)} late`)
}

/** Claims that have earned a place in the instincts. */
export function select(store: Store, config: Config): MemoryEntry[] {
  return store.active()
    .filter((e) => !e.distilled && claimAction(e.claim) !== null)
    .filter((e) => e.strength >= config.S_CONSOLIDATE && e.reads >= config.N_MIN)
    .filter((e) => e.gains / Math.max(1, e.gains + e.pains) >= config.GAIN_RATIO)
    .sort((a, b) => a.id.localeCompare(b.id))
}

function buildDataset(day: PlayedDay, selected: MemoryEntry[], registry: Instincts, store: Store, night: number, seed: number, config: Config, core: MazeCore): { dataset: Dataset; taught: MemoryEntry[]; provenance: Map<string, string> } {
  const chosen = new Set(selected.map((e) => e.id))
  const sft: SftExample[] = []
  const supported = new Set<string>()
  const provenance = new Map<string, string>()
  const actionsBySituation = new Map<string, { gained: Set<string>; pained: Set<string> }>()

  for (const episode of day.record) {
    for (const trace of episode.traces) {
      const followed = trace.entries.filter((r) => chosen.has(r.id) && claimAction(store.entries.get(r.id)!.claim) === trace.action)
      if (followed.length === 0) continue
      const situation = keyText(trace.situation)
      const seen = actionsBySituation.get(situation) ?? { gained: new Set(), pained: new Set() }
      ;(episode.score.gain ? seen.gained : seen.pained).add(trace.action)
      actionsBySituation.set(situation, seen)
      if (!episode.score.gain) continue
      // the situation and the action — the claim that prompted it is left out on purpose
      sft.push({ situation, key: trace.situation, action: trace.action })
      for (const r of followed) supported.add(r.id)
      const prompter = [...followed].map((r) => r.id).sort()[0]!
      if (!provenance.has(`${situation}|${trace.action}`)) provenance.set(`${situation}|${trace.action}`, prompter)
    }
  }

  const pairs: PreferencePair[] = []
  for (const [situation, seen] of actionsBySituation) {
    for (const chosenAction of [...seen.gained].sort()) {
      for (const rejected of [...seen.pained].sort()) {
        if (chosenAction !== rejected) pairs.push({ situation, chosen: chosenAction, rejected })
      }
    }
  }

  const pool = registry.nights.flat()
  const replay: SftExample[] = []
  const rng = core.Rng(deriveSeed(seed, 'replay', night))
  const want = Math.floor(config.REPLAY_RATIO * sft.length)
  for (let i = 0; i < want && pool.length > 0; i++) replay.push(pool[rng.int(pool.length)]!)

  return { dataset: { night, sft, pairs, replay }, taught: selected.filter((e) => supported.has(e.id)), provenance }
}

/** The maze's held-out play: a fixed set of mazes the day never generates. */
export function mazeHeldOut(m: { store: Store; core: MazeCore; seed: number; config: Config; sim: Similarity; keying: MazeKeying }): HeldOut {
  return { play: (run) => mazeRegression({ ...m, ...run }) }
}

function mazeRegression(o: {
  store: Store; core: MazeCore; seed: number; config: Config; sim: Similarity; keying: MazeKeying
  instincts: Adapter; hidden: ReadonlySet<string>; alone?: boolean
}): { reward: number; followed: Array<{ id: string; situation: SituationKey; action: string }> } {
  const rewards: number[] = []
  const followed: Array<{ id: string; situation: SituationKey; action: string }> = []
  for (let i = 0; i < o.config.REGRESSION_MAZES; i++) {
    const maze = new o.core.Maze(o.core.Rng(deriveSeed(o.seed, 'regression', i, 'maze')))
    const result = playEpisode({
      core: o.core, maze, store: o.store, player: new MockPlayer(o.config.EPS), config: o.config, sim: o.sim,
      rng: o.core.Rng(deriveSeed(o.seed, 'regression', i, 'play')), day: -1, episodeId: `regression${i}`,
      useStore: !o.alone, keying: o.keying, instincts: o.instincts, hidden: o.hidden,
    })
    rewards.push(result.score.reward)
    for (const trace of result.traces) {
      for (const read of trace.entries) {
        if (claimAction(o.store.entries.get(read.id)!.claim) === trace.action) {
          followed.push({ id: read.id, situation: trace.situation, action: trace.action })
        }
      }
    }
  }
  return { reward: mean(rewards), followed }
}

export interface NightReport {
  slept: boolean
  undone: boolean
  reason: string
  /** The version of the instincts the player wakes with. */
  wokeWith: number
  gate: GateVerdict
  selected: string[]
  absorbed: string[]
  dataset: Dataset | null
  regression: { before: number; after: number } | null
}

export interface NightOptions {
  store: Store
  instincts: Instincts
  day: PlayedDay
  /** Where the night tries its work out. Default: the maze's held-out mazes. */
  heldOut?: HeldOut
  /** How far instincts reach. Default: whatever the held-out play reaches, else exact. */
  reach?: Reach
  seed: number
  config?: Partial<Config>
  trainer?: Trainer
  core?: MazeCore
  keying?: MazeKeying
  sim?: Similarity
}

export function sleepNight(o: NightOptions): NightReport {
  const config = configWith(o.config)
  const core = o.core ?? loadCore()
  const keying = o.keying ?? 'situation'
  const sim = o.sim ?? (keying === 'situation+bearing' ? mazeBearingSimilarity : mazeSimilarity)
  const trainer = o.trainer ?? new MockTrainer()
  const proving = o.heldOut ?? mazeHeldOut({ store: o.store, core, seed: o.seed, config, sim, keying })
  const before = o.instincts.current()
  const night = o.day.day

  const finish = (r: Omit<NightReport, 'wokeWith'>): NightReport => {
    const report = { ...r, wokeWith: o.instincts.current().version }
    o.store.apply({ type: 'sleep', day: night, slept: report.slept, undone: report.undone, version: report.wokeWith, absorbed: report.absorbed, reason: report.reason })
    return report
  }

  const verdict = gate(o.day, config)
  if (!verdict.open) {
    return finish({ slept: false, undone: false, reason: `not slept on: ${verdict.reason}`, gate: verdict, selected: [], absorbed: [], dataset: null, regression: null })
  }

  const selected = select(o.store, config)
  const { dataset, taught, provenance } = buildDataset(o.day, selected, o.instincts, o.store, night, o.seed, config, core)
  if (taught.length === 0) {
    return finish({ slept: false, undone: false, reason: 'nothing had proved itself enough to teach', gate: verdict, selected: selected.map((e) => e.id), absorbed: [], dataset, regression: null })
  }

  const next = trainer.train({ from: before, dataset, taught, version: o.instincts.next(), provenance })
  const report = { slept: true, gate: verdict, selected: selected.map((e) => e.id), dataset }

  // the new instincts must agree with what they were taught
  const contradicted = taught.filter((e) => next.instincts.some((i) => i.from === e.id && i.action !== claimAction(e.claim)))
  if (contradicted.length > 0) {
    return finish({ ...report, undone: true, reason: `undone: the new instincts contradict ${contradicted.length} of the ${taught.length} claims they were taught`, absorbed: [], regression: null })
  }

  // the new version, judged with nothing in context, must not be worse than the
  // old one judged the same way. With claims in context, a defect in the
  // instincts hides behind them until the claims fade — and then surfaces.
  const aloneBefore = proving.play({ instincts: before, hidden: new Set(), alone: true })
  const aloneAfter = proving.play({ instincts: next, hidden: new Set(), alone: true })
  if (aloneAfter.reward < aloneBefore.reward - config.FORGET_DELTA) {
    return finish({
      ...report, undone: true, absorbed: [],
      reason: `undone: on its own, the new version of the instincts scored ${aloneAfter.reward.toFixed(3)} on held-out mazes against ${aloneBefore.reward.toFixed(3)} for the old`,
      regression: { before: aloneBefore.reward, after: aloneAfter.reward },
    })
  }

  // absorbed, on mazes the night was not taught from, means two things:
  //
  //   carried  the new instincts make the decisions this claim was making,
  //            everywhere it was followed — the weights took it in
  //   spared   with this claim alone gone from context, the player does as well
  //
  // The second is the spec's test, and it is not implied by the first. The
  // player consults claims before instincts, so when a claim leaves context
  // the next claim down for that situation — often a worse one — is followed
  // instead, and the instinct never gets a say. Checking only the first let
  // nights through that cost 0.15–0.55 in held-out reward.
  const base = proving.play({ instincts: before, hidden: new Set() })
  const carried = taught.filter((e) => {
    const decisions = base.followed.filter((f) => f.id === e.id)
    if (decisions.length === 0) return false
    const reproduced = decisions.filter((f) => instinctFor(next, f.situation, o.reach ?? proving.reach) === f.action).length / decisions.length
    return reproduced >= 1 - config.DELTA
  })
  const absorbed = carried.filter((e) => {
    const without = proving.play({ instincts: next, hidden: new Set([e.id]) })
    return without.reward >= base.reward - config.DELTA
  })

  // and the player, with those claims gone from its context, must not do worse
  const after = proving.play({ instincts: next, hidden: new Set(absorbed.map((e) => e.id)) })
  if (after.reward < base.reward - config.FORGET_DELTA) {
    return finish({
      ...report, undone: true, absorbed: [],
      reason: `undone: on held-out mazes the new instincts scored ${after.reward.toFixed(3)} against ${base.reward.toFixed(3)} before`,
      regression: { before: base.reward, after: after.reward },
    })
  }

  o.instincts.adopt(next)
  o.instincts.nights.push(dataset.sft)
  return finish({
    ...report, undone: false, absorbed: absorbed.map((e) => e.id),
    reason: `slept: taught ${taught.length}, absorbed ${absorbed.length}; held-out mazes ${base.reward.toFixed(3)} → ${after.reward.toFixed(3)}`,
    regression: { before: base.reward, after: after.reward },
  })
}
