/**
 * The maze core, loaded only if it is the one the engine was proven on.
 *
 * The bytes are hashed and then those same bytes are evaluated, so nothing can
 * change between the check and the load. A core that has moved — edited here,
 * or re-vendored without updating the pin — is refused rather than trusted,
 * because every number this engine reports is only meaningful against the
 * core that produced it.
 */
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'

export interface CorePin {
  version: string
  sha256: string
  source: string
  sourceCommit?: string
}

/** The parts of maze-core/4 the engine uses. */
export interface MazeCore {
  VERSION: string
  N: number
  DIRS: string[]
  DELTA: Record<string, [number, number]>
  OPP: Record<string, string>
  Rng(seed: number): RngFn
  Maze: new (rng: RngFn) => Maze
  situation(maze: Maze, x: number, y: number, from: string): string
  moveCap(maze: Maze): number
}

export interface RngFn {
  (): number
  int(n: number): number
  pick<T>(xs: T[]): T
}

export interface Maze {
  start: [number, number]
  goal: [number, number]
  shortest: number
  blocked(x: number, y: number, d: string): boolean
  judge(x: number, y: number, d: string): { kind: 'wall' | 'step' | 'goal'; x: number; y: number }
}

export class CorePinError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CorePinError'
  }
}

const HERE = import.meta.dir

export const DEFAULT_CORE_PATH = join(HERE, 'maze-core.js')
export const DEFAULT_PIN_PATH = join(HERE, 'maze-core.pin.json')

export function readPin(path: string = DEFAULT_PIN_PATH): CorePin {
  return JSON.parse(readFileSync(path, 'utf-8')) as CorePin
}

export function sha256(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

const cache = new Map<string, MazeCore>()

export function loadCore(options: { path?: string; pin?: CorePin } = {}): MazeCore {
  const path = options.path ?? DEFAULT_CORE_PATH
  const pin = options.pin ?? readPin()
  const bytes = readFileSync(path)
  const actual = sha256(bytes)
  if (actual !== pin.sha256) {
    throw new CorePinError(
      `the maze core does not match its pin: ${path} hashes to ${actual.slice(0, 12)}…, ` +
      `the pin expects ${pin.sha256.slice(0, 12)}… (${pin.version}). ` +
      `Every number this engine reports is relative to the pinned core; re-pin deliberately or restore it.`
    )
  }
  const cached = cache.get(actual)
  if (cached) return cached

  // evaluate exactly the bytes that were hashed, with a module of our own
  const module = { exports: {} as unknown }
  const previous = (globalThis as Record<string, unknown>).LoopMaze
  try {
    new Function('module', 'exports', bytes.toString('utf-8'))(module, module.exports)
  } finally {
    if (previous === undefined) delete (globalThis as Record<string, unknown>).LoopMaze
    else (globalThis as Record<string, unknown>).LoopMaze = previous
  }
  const core = module.exports as MazeCore
  if (core.VERSION !== pin.version) {
    throw new CorePinError(`the maze core reports ${core.VERSION}, the pin expects ${pin.version}`)
  }
  cache.set(actual, core)
  return core
}
