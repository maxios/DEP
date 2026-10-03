/**
 * How a night tries its work out in a game of scenarios: answering levels no
 * day was allowed to play, and asking the same judge. The levels are fixed and
 * each one's answers come from its own seeded stream, so two plays that differ
 * only in which claims are hidden, or which instincts are in force, differ only
 * where those choices made a difference.
 */
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { instinctFor, type Adapter } from '../adapter'
import { deriveSeed } from '../canonical'
import { configWith, type Config } from '../config'
import type { Similarity } from '../key'
import { read } from '../read'
import type { HeldOut } from '../sleep'
import type { Store } from '../store'
import type { SituationKey } from '../types'
import { loadCore } from '../vendor/core'
import { claimAction } from '../write'
import type { Level, LoadedGame } from './game'
import { ChoosingPlayer, arenaRel, gameReach, refusal, situationSimilarity, type SuitePlayer } from './play'
import { judge, type VerdictCache } from './suite'

export interface SuiteHeldOutOptions {
  loaded: LoadedGame
  root: string
  store: Store
  /** The levels kept for nights — none of them should ever be played by day. */
  levels: Level[]
  seed: number
  config?: Partial<Config>
  sim?: Similarity
  player?: SuitePlayer
  cache?: VerdictCache
  stats?: { runs: number }
}

export function suiteHeldOut(o: SuiteHeldOutOptions): HeldOut & { judged: Set<string> } {
  const judged = new Set<string>()
  const config = configWith(o.config)
  const core = loadCore()
  const { game } = o.loaded
  const arena = arenaRel(o.root, game)
  const sim = o.sim ?? situationSimilarity(game)
  const player = o.player ?? new ChoosingPlayer(arena, config.EPS)

  const play = (run: { instincts: Adapter; hidden: ReadonlySet<string>; alone?: boolean }) => {
    rmSync(join(o.root, arena, 'choices'), { recursive: true, force: true })
    const answers = new Map<string, string>()
    const decisions: Array<{ level: Level; choice: string; read: Array<{ id: string }> }> = []
    o.levels.forEach((level, i) => {
      const rng = core.Rng(deriveSeed(o.seed, 'held-out', i))
      const shown = run.alone ? { claims: [], entries: [] } : read(o.store, level.key, rng, config, sim, run.hidden)
      const answer = player.act({ level, key: level.key, options: game.actions.options, instinct: instinctFor(run.instincts, level.key, gameReach(game, config)) }, shown.claims, rng)
      const writes = (Array.isArray(answer.writes) ? answer.writes : []).filter((w) => refusal(o.root, game, w) === null)
      for (const w of writes) {
        const full = resolve(o.root, w.path)
        mkdirSync(dirname(full), { recursive: true })
        writeFileSync(full, w.content)
      }
      answers.set(level.id, JSON.stringify(writes))
      decisions.push({ level, choice: String(answer.choice), read: shown.entries })
      judged.add(level.id)
    })

    const verdicts = judge(o.root, game, o.levels, { answers, cache: o.cache, stats: o.stats })
    const rewards = o.levels.map((l) => (verdicts.get(l.id) === 'passed' ? game.scoring.pass : game.scoring.fail))
    const followed: Array<{ id: string; situation: SituationKey; action: string }> = []
    for (const d of decisions) {
      for (const r of d.read) {
        if (claimAction(o.store.entries.get(r.id)!.claim) === d.choice) followed.push({ id: r.id, situation: d.level.key, action: d.choice })
      }
    }
    return { reward: rewards.reduce((a, b) => a + b, 0) / Math.max(1, rewards.length), followed }
  }

  return { judged, play, reach: gameReach(game, config) }
}
