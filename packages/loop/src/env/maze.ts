/**
 * The maze as the context game's environment. The maze core owns the walls and
 * judges every move; this adapter only carries the player's chosen direction
 * to the judge and the judge's verdict to the Scorer.
 */
import type { Config } from '../config'
import { bearing, mazeKey, mazeKeyWithBearing, type MazeKeying, type Similarity } from '../key'
import type { Player } from '../players/mock'
import { read } from '../read'
import { score } from '../scorer'
import type { Store } from '../store'
import type { EpisodeResult, ReadTrace, Rng } from '../types'
import type { Maze, MazeCore } from '../vendor/core'

export interface EpisodeOptions {
  core: MazeCore
  maze: Maze
  store: Store
  player: Player
  config: Config
  sim: Similarity
  rng: Rng
  day: number
  episodeId: string
  useStore: boolean
  keying: MazeKeying
}

export function playEpisode(o: EpisodeOptions): EpisodeResult {
  const { core, maze } = o
  const cell = (x: number, y: number) => `${x},${y}`
  let [x, y] = maze.start
  let from = '-'
  let moves = 0
  let reached = false
  const traces: ReadTrace[] = []
  const cap = core.moveCap(maze)
  o.player.startEpisode()

  while (moves < cap) {
    const situation = core.situation(maze, x, y, from)
    const key = o.keying === 'situation+bearing'
      ? mazeKeyWithBearing(situation, bearing(x, y, maze.goal))
      : mazeKey(situation)
    const open = core.DIRS.filter((d) => !maze.blocked(x, y, d))
    const next: Record<string, string> = {}
    for (const d of open) next[d] = cell(x + core.DELTA[d]![0], y + core.DELTA[d]![1])

    const shown = o.useStore ? read(o.store, key, o.rng, o.config, o.sim) : { claims: [], entries: [] }
    // only the direction is taken from what the player returns
    const action = String(o.player.act({ key, open, cell: cell(x, y), next, from }, shown.claims, o.rng).action)
    traces.push({ step: moves, situation: key, entries: shown.entries.map((e) => ({ id: e.id, share: e.share })), action })
    moves++

    if (!core.DIRS.includes(action)) continue // not a move; the turn is spent
    const verdict = maze.judge(x, y, action)
    if (verdict.kind === 'wall') continue
    x = verdict.x
    y = verdict.y
    from = core.OPP[action]!
    if (verdict.kind === 'goal') {
      reached = true
      break
    }
  }

  const proposals = o.player.endEpisode(reached) as never[]
  return {
    episodeId: o.episodeId,
    day: o.day,
    traces,
    score: score({ reached, moves, shortest: maze.shortest }),
    proposals,
    moves,
    shortest: maze.shortest,
    reached,
  }
}
