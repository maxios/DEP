/**
 * A day of a game of scenarios. The player answers a sample of levels — each
 * answer is a set of file writes — the scenarios are run once for the whole
 * sample, and each verdict becomes an episode for the store, exactly as a maze
 * run does. The store, the write path and the day clock are the maze's; only
 * the environment changed.
 *
 * A write is checked before it lands: outside the game's writable paths, or
 * onto the judge's ground, and the level is void — not judged, not learned
 * from, and reported. The judge's ground is also fingerprinted before and
 * after the day, so a write that slipped round the check voids the whole day.
 */
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { dirname, join, relative, resolve } from 'path'
import type { Adapter } from '../adapter'
import { instinctFor } from '../adapter'
import { deriveSeed } from '../canonical'
import { endDay, type ClockOptions, type ClockReport } from '../clock'
import { configWith, type Config } from '../config'
import { featureSimilarity, type Similarity } from '../key'
import { read } from '../read'
import type { Store } from '../store'
import type { ReadTrace, Rng, Score, SituationKey } from '../types'
import { loadCore } from '../vendor/core'
import { write } from '../write'
import type { Game, Level, LoadedGame } from './game'
import { judge, type Verdict } from './suite'

export interface Write {
  path: string
  content: string
}

export interface SuiteView {
  level: Level
  key: SituationKey
  options: string[]
  instinct?: string | null
}

export interface SuitePlayer {
  /** Answer a level. Only `writes` and `choice` are read; anything else is ignored. */
  act(view: SuiteView, claims: string[], rng: Rng): { writes: Write[]; choice: string; [extra: string]: unknown }
  /** Claims to suggest once the level is judged. Text only. */
  propose(view: SuiteView, passed: boolean, choice: string): unknown[]
}

export interface SuiteEpisode {
  level: string
  choice: string
  verdict: Verdict | 'void'
  reward: number
  pain: boolean
  regression: boolean
  read: number
  reason?: string
}

export interface SuiteDayResult {
  day: number
  episodes: SuiteEpisode[]
  voided: Array<{ level: string; reason: string }>
  metrics: {
    episodes: number
    passRate: number
    painRate: number
    meanReward: number
    entriesPerStep: number
    activeEntries: number
    rules: number
    regressions: number
  }
  fingerprint: string
  head: string
  clock: ClockReport | null
  record: Array<{ traces: ReadTrace[]; score: Score }>
}

export interface SuiteDayOptions {
  loaded: LoadedGame
  root: string
  store: Store
  seed: number
  day: number
  player?: SuitePlayer
  useStore?: boolean
  config?: Partial<Config>
  instincts?: Adapter
  /** Levels per day. Default 40. */
  count?: number
  /** Levels never played by day — kept for judging nights. */
  heldOut?: ReadonlySet<string>
  clock?: false | ClockOptions
  /** Each level's last verdict, carried across days, so breaking a passing level can be told apart. */
  history?: Map<string, Verdict>
  sim?: Similarity
}

/** The arena's contract with a choosing player: one file per level, holding the choice. */
export const choicePath = (arena: string, level: string) => `${arena}/choices/${level.replace(/[^A-Za-z0-9]+/g, '_')}.json`

/** Answers with the best claim it can act on; explores on instinct, then at random. */
export class ChoosingPlayer implements SuitePlayer {
  constructor(private readonly arena: string, private readonly explore = 0.1) {}

  act(view: SuiteView, claims: string[], rng: Rng): { writes: Write[]; choice: string } {
    const applicable = claims.map((c) => /^choose (\S+)$/.exec(c)?.[1]).filter((o): o is string => !!o && view.options.includes(o))
    const roll = rng()
    let choice: string
    if (applicable.length > 0 && roll >= this.explore) choice = applicable[0]!
    else if (view.instinct && view.options.includes(view.instinct)) choice = view.instinct
    else choice = rng.pick(view.options)
    return { writes: [{ path: choicePath(this.arena, view.level.id), content: JSON.stringify({ option: choice }) }], choice }
  }

  propose(view: SuiteView, passed: boolean, choice: string): unknown[] {
    return passed ? [{ kind: 'episode', key: view.key, claim: `choose ${choice}` }] : []
  }
}

function globMatch(pattern: string, path: string): boolean {
  return new Bun.Glob(pattern).match(path)
}

/** Every file under a directory, fingerprinted — the judge's ground, before and after. */
function groundPrint(dir: string): string {
  const hash = createHash('sha256')
  const walk = (d: string) => {
    if (!existsSync(d)) return
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else hash.update(full).update(readFileSync(full))
    }
  }
  walk(dir)
  return hash.digest('hex')
}

function arenaRel(root: string, game: Game): string {
  return relative(root, game.arena).split('\\').join('/')
}

/** Why a write may not land, or null when it may. */
export function refusal(root: string, game: Game, w: Write): string | null {
  const full = resolve(root, w.path)
  const rel = relative(root, full).split('\\').join('/')
  if (rel.startsWith('..')) return `${w.path} is outside the project`
  const arena = arenaRel(root, game)
  const ground = [`${arena}/features/**`, `${arena}/steps/**`, ...game.actions.neverWrite]
  const onGround = ground.find((g) => globMatch(g, rel))
  if (onGround) return `${rel} is where the player is judged (${onGround})`
  if (!game.actions.mayWrite.some((m) => globMatch(m, rel))) return `${rel} is not somewhere the player may write`
  return null
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function playSuiteDay(o: SuiteDayOptions): SuiteDayResult {
  const config = configWith(o.config)
  const core = loadCore()
  const { game, levels } = o.loaded
  const arena = arenaRel(o.root, game)
  const sim = o.sim ?? featureSimilarity(Object.fromEntries(Object.keys(game.situation).map((f) => [f, 1])))
  const player = o.player ?? new ChoosingPlayer(arena, config.EPS)
  const useStore = o.useStore ?? true
  const history = o.history ?? new Map<string, Verdict>()

  // the day's levels: a seeded sample of those not held out
  const pool = levels.filter((l) => !o.heldOut?.has(l.id)).sort((a, b) => a.id.localeCompare(b.id))
  const pick = core.Rng(deriveSeed(o.seed, o.day, 'levels'))
  const chosen: Level[] = []
  const remaining = [...pool]
  while (chosen.length < Math.min(o.count ?? 40, pool.length)) chosen.push(remaining.splice(pick.int(remaining.length), 1)[0]!)

  // a fresh workspace each day: last day's answers do not carry over
  rmSync(join(o.root, arena, 'choices'), { recursive: true, force: true })
  const groundBefore = groundPrint(join(game.arena, 'features')) + groundPrint(join(game.arena, 'steps'))

  type Pending = { level: Level; view: SuiteView; trace: ReadTrace; choice: string; read: number }
  const pending: Pending[] = []
  const voided: SuiteDayResult['voided'] = []
  chosen.forEach((level, i) => {
    const rng = core.Rng(deriveSeed(o.seed, o.day, i, 'play'))
    const shown = useStore ? read(o.store, level.key, rng, config, sim) : { claims: [], entries: [] }
    const view: SuiteView = { level, key: level.key, options: game.actions.options, instinct: o.instincts ? instinctFor(o.instincts, level.key) : null }
    const answer = player.act(view, shown.claims, rng)
    const writes = Array.isArray(answer.writes) ? answer.writes : []
    const refused = writes.map((w) => refusal(o.root, game, w)).find((r) => r !== null)
    if (refused) {
      voided.push({ level: level.id, reason: refused })
      return
    }
    for (const w of writes) {
      const full = resolve(o.root, w.path)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, w.content)
    }
    const choice = String(answer.choice)
    pending.push({ level, view, choice, read: shown.entries.length, trace: { step: 0, situation: level.key, entries: shown.entries.map((e) => ({ id: e.id, share: e.share })), action: choice } })
  })

  const verdicts = judge(o.root, game, pending.map((p) => p.level))

  // anything that changed the judge's ground voids the day: no verdict from it can be trusted
  const groundAfter = groundPrint(join(game.arena, 'features')) + groundPrint(join(game.arena, 'steps'))
  if (groundAfter !== groundBefore) {
    for (const p of pending) voided.push({ level: p.level.id, reason: "the judge's ground changed during the day" })
    pending.length = 0
  }

  const episodes: SuiteEpisode[] = []
  const record: SuiteDayResult['record'] = []
  for (const p of pending) {
    const verdict = verdicts.get(p.level.id) ?? 'failed'
    const passed = verdict === 'passed'
    const regression = !passed && history.get(p.level.id) === 'passed'
    const reward = passed ? game.scoring.pass : regression ? game.scoring.regression : game.scoring.fail
    const score: Score = { reward, pain: !passed, gain: passed }
    history.set(p.level.id, verdict)
    if (useStore) {
      write(o.store, { episodeId: `d${o.day}:${p.level.id}`, day: o.day, traces: [p.trace], score, proposals: player.propose(p.view, passed, p.choice) }, config, sim)
    }
    record.push({ traces: [p.trace], score })
    episodes.push({ level: p.level.id, choice: p.choice, verdict, reward, pain: !passed, regression, read: p.read })
  }
  for (const v of voided) episodes.push({ level: v.level, choice: '', verdict: 'void', reward: 0, pain: false, regression: false, read: 0, reason: v.reason })

  let clock: ClockReport | null = null
  if (useStore) {
    clock = o.clock === false
      ? endDay(o.store, o.day, config, sim, { fade: false, putAway: false, fold: false })
      : endDay(o.store, o.day, config, sim, o.clock ?? {})
  }

  const judged = episodes.filter((e) => e.verdict !== 'void')
  return {
    day: o.day,
    episodes,
    voided,
    metrics: {
      episodes: judged.length,
      passRate: mean(judged.map((e) => (e.verdict === 'passed' ? 1 : 0))),
      painRate: mean(judged.map((e) => (e.pain ? 1 : 0))),
      meanReward: mean(judged.map((e) => e.reward)),
      entriesPerStep: mean(judged.map((e) => e.read)),
      activeEntries: o.store.active().length,
      rules: o.store.active().filter((e) => e.kind === 'rule').length,
      regressions: judged.filter((e) => e.regression).length,
    },
    fingerprint: o.store.fingerprint(),
    head: o.store.head,
    clock,
    record,
  }
}
