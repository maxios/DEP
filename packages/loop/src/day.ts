/**
 * A day: a run of episodes, each on a fresh maze. Fresh mazes are the point —
 * nothing the store learns about a particular maze can help on the next one,
 * so whatever helps is a claim about situations, which is what rule 7 asks
 * memory to be keyed by.
 *
 * Mazes and play draw from separate seeded streams, so the same day played
 * with and without a store faces exactly the same mazes.
 */
import { configWith, type Config } from './config'
import { deriveSeed } from './canonical'
import { playEpisode } from './env/maze'
import { mazeBearingSimilarity, mazeSimilarity, type MazeKeying, type Similarity } from './key'
import { MockPlayer, type Player } from './players/mock'
import type { Store } from './store'
import { loadCore, type MazeCore } from './vendor/core'
import { write } from './write'
import { endDay, type ClockOptions, type ClockReport } from './clock'
import type { Adapter } from './adapter'
import type { ReadTrace, Score } from './types'

export interface DayOptions {
  seed: number
  day: number
  store: Store
  config?: Partial<Config>
  player?: Player
  /** Play without reading or writing the store — the control. */
  useStore?: boolean
  core?: MazeCore
  sim?: Similarity
  episodes?: number
  /** What counts as the same situation. Default: walls and entry side, as the maze core keys its habits. */
  keying?: MazeKeying
  /** The end-of-day clock: fade, put away, fold. `false` skips it entirely. */
  clock?: false | ClockOptions
  /** The player's instincts for the day. */
  instincts?: Adapter
}

export interface EpisodeSummary {
  episodeId: string
  reached: boolean
  moves: number
  shortest: number
  reward: number
  pain: boolean
  read: number
  created: number
}

export interface DayMetrics {
  episodes: number
  painRate: number
  painRateEarly: number
  painRateLate: number
  meanReward: number
  /** Moves taken over the shortest path, averaged: 1 is perfect. */
  meanStretch: number
  /** Claims shown per step, averaged — the spec's "entries in context". */
  entriesPerStep: number
  activeEntries: number
  rules: number
  created: number
}

export interface DayResult {
  day: number
  episodes: EpisodeSummary[]
  metrics: DayMetrics
  fingerprint: string
  head: string
  clock: ClockReport | null
  /** Each episode's reads and score — what a night learns from. */
  record: Array<{ traces: ReadTrace[]; score: Score }>
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function playDay(o: DayOptions): DayResult {
  const core = o.core ?? loadCore()
  const config = configWith(o.config)
  const keying = o.keying ?? 'situation'
  const sim = o.sim ?? (keying === 'situation+bearing' ? mazeBearingSimilarity : mazeSimilarity)
  const player = o.player ?? new MockPlayer(config.EPS)
  const useStore = o.useStore ?? true
  const count = o.episodes ?? config.EPISODES_PER_DAY
  const episodes: EpisodeSummary[] = []
  const record: DayResult['record'] = []

  for (let ep = 0; ep < count; ep++) {
    const maze = new core.Maze(core.Rng(deriveSeed(o.seed, o.day, ep, 'maze')))
    const rng = core.Rng(deriveSeed(o.seed, o.day, ep, 'play'))
    const episodeId = `d${o.day}e${ep}`
    const result = playEpisode({ core, maze, store: o.store, player, config, sim, rng, day: o.day, episodeId, useStore, keying, instincts: o.instincts })
    record.push({ traces: result.traces, score: result.score })
    const written = useStore ? write(o.store, result, config, sim) : { created: 0, credited: 0 }
    episodes.push({
      episodeId,
      reached: result.reached,
      moves: result.moves,
      shortest: result.shortest,
      reward: result.score.reward,
      pain: result.score.pain,
      read: result.traces.reduce((sum, t) => sum + t.entries.length, 0) / Math.max(1, result.traces.length),
      created: written.created,
    })
  }
  let clock: ClockReport | null = null
  if (useStore) {
    clock = o.clock === false
      ? endDay(o.store, o.day, config, sim, { fade: false, putAway: false, fold: false })
      : endDay(o.store, o.day, config, sim, o.clock ?? {})
  }

  const half = Math.floor(episodes.length / 2)
  const rate = (xs: EpisodeSummary[]) => mean(xs.map((e) => (e.pain ? 1 : 0)))
  return {
    day: o.day,
    episodes,
    metrics: {
      episodes: episodes.length,
      painRate: rate(episodes),
      painRateEarly: rate(episodes.slice(0, half)),
      painRateLate: rate(episodes.slice(half)),
      meanReward: mean(episodes.map((e) => e.reward)),
      meanStretch: mean(episodes.map((e) => e.moves / e.shortest)),
      entriesPerStep: mean(episodes.map((e) => e.read)),
      activeEntries: o.store.active().length,
      rules: o.store.active().filter((e) => e.kind === 'rule').length,
      created: episodes.reduce((sum, e) => sum + e.created, 0),
    },
    fingerprint: o.store.fingerprint(),
    head: o.store.head,
    clock,
    record,
  }
}
