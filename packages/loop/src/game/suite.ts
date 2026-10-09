/**
 * The judge of a game: run the arena's scenarios with Cucumber and read back
 * which passed. The verdicts come from Cucumber's own message stream, written
 * outside the arena — never from a file the arena or the player could write.
 */
import { spawnSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import type { Game, Level } from './game'

export type Verdict = 'passed' | 'failed'

/** Verdicts already earned, keyed by the judge, the level and the answer. */
export type VerdictCache = Map<string, Verdict>

/** Every file the judge is made of, fingerprinted. */
export function groundPrint(game: Game): string {
  const hash = createHash('sha256')
  const walk = (d: string) => {
    if (!existsSync(d)) return
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else hash.update(full).update(readFileSync(full))
    }
  }
  walk(join(game.arena, 'features'))
  walk(join(game.arena, 'steps'))
  return hash.digest('hex')
}

export interface JudgeOptions {
  /** Each level's answer, as written — part of what a reused verdict is keyed by. */
  answers?: ReadonlyMap<string, string>
  cache?: VerdictCache
  /** Counts the times the scenarios were actually run. */
  stats?: { runs: number; stalls?: number }
}

/** Far longer than any judging takes (a day's sample runs in about two seconds). */
const JUDGE_TIMEOUT_MS = 120_000

const CUCUMBER = resolve(import.meta.dir, '..', '..', 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js')

interface Envelope {
  gherkinDocument?: { uri: string; feature?: { children: Array<{ scenario?: { id: string; location: { line: number }; examples: Array<{ tableBody: Array<{ id: string; location: { line: number } }> }> } }> } }
  pickle?: { id: string; uri: string; astNodeIds: string[] }
  testCase?: { id: string; pickleId: string }
  testCaseStarted?: { id: string; testCaseId: string }
  testStepFinished?: { testCaseStartedId: string; testStepResult: { status: string } }
}

/**
 * Run the given levels; every level gets a verdict, a level Cucumber did not
 * report fails. Where the game promises its levels stand alone, a verdict is
 * reused for the same answer to the same level — keyed by the judge's own
 * fingerprint, so any change to the scenarios or steps makes every earlier
 * verdict a stranger.
 */
export function judge(root: string, game: Game, all: Level[], options: JudgeOptions = {}): Map<string, Verdict> {
  const verdicts = new Map<string, Verdict>(all.map((l) => [l.id, 'failed']))
  const reuse = game.levelsIndependent && options.cache && options.answers
  const ground = reuse ? groundPrint(game) : ''
  const keyOf = (level: Level) => `${ground}|${level.id}|${options.answers?.get(level.id) ?? ''}`
  const levels: Level[] = []
  for (const level of all) {
    const known = reuse ? options.cache!.get(keyOf(level)) : undefined
    if (known) verdicts.set(level.id, known)
    else levels.push(level)
  }
  if (levels.length === 0) return verdicts
  if (options.stats) options.stats.runs++
  const out = mkdtempSync(join(tmpdir(), 'loop-judge-'))
  const messages = join(out, 'messages.ndjson')
  try {
    const targets = [...new Set(levels.map((l) => `${l.file}:${l.line}`))]
    const once = () => spawnSync('bun', ['--bun', CUCUMBER,
      '--import', `${relativeArena(root, game)}/steps/**/*.ts`,
      '--format', `message:${messages}`,
      ...targets,
    ], { cwd: root, encoding: 'utf-8', env: { ...process.env, FORCE_COLOR: '0' }, timeout: JUDGE_TIMEOUT_MS, killSignal: 'SIGKILL' })
    // Cucumber has been seen to stall while loading, before running anything;
    // a stalled run is killed and tried once more rather than waited on forever
    let run = once()
    if (run.error) {
      if (options.stats) options.stats.stalls = (options.stats.stalls ?? 0) + 1
      rmSync(messages, { force: true })
      run = once()
    }
    if (run.error) throw new Error(`the scenarios stalled twice and were stopped after ${JUDGE_TIMEOUT_MS / 1000}s each`)
    if (!existsSync(messages)) {
      throw new Error(`the scenarios could not be run: ${run.stderr || run.stdout}`.slice(0, 2000))
    }

    const lines = new Map<string, number>()
    const pickleLevel = new Map<string, string>()
    const caseToPickle = new Map<string, string>()
    const startedToCase = new Map<string, string>()
    const status = new Map<string, string[]>()
    for (const raw of readFileSync(messages, 'utf-8').split('\n')) {
      if (!raw.trim()) continue
      const e = JSON.parse(raw) as Envelope
      if (e.gherkinDocument) {
        for (const child of e.gherkinDocument.feature?.children ?? []) {
          const s = child.scenario
          if (!s) continue
          lines.set(s.id, s.location.line)
          for (const ex of s.examples) for (const row of ex.tableBody) lines.set(row.id, row.location.line)
        }
      } else if (e.pickle) {
        const [scenario, row] = e.pickle.astNodeIds
        const id = row ? `${e.pickle.uri}:${lines.get(scenario!)}:${lines.get(row)}` : `${e.pickle.uri}:${lines.get(scenario!)}`
        pickleLevel.set(e.pickle.id, id)
      } else if (e.testCase) {
        caseToPickle.set(e.testCase.id, e.testCase.pickleId)
      } else if (e.testCaseStarted) {
        startedToCase.set(e.testCaseStarted.id, e.testCaseStarted.testCaseId)
      } else if (e.testStepFinished) {
        const steps = status.get(e.testStepFinished.testCaseStartedId) ?? []
        steps.push(e.testStepFinished.testStepResult.status)
        status.set(e.testStepFinished.testCaseStartedId, steps)
      }
    }
    for (const [started, steps] of status) {
      const level = pickleLevel.get(caseToPickle.get(startedToCase.get(started) ?? '') ?? '')
      if (level && verdicts.has(level)) verdicts.set(level, steps.every((s) => s === 'PASSED') ? 'passed' : 'failed')
    }
    if (reuse) for (const level of levels) options.cache!.set(keyOf(level), verdicts.get(level.id)!)
    return verdicts
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

function relativeArena(root: string, game: Game): string {
  return game.arena.startsWith(root) ? game.arena.slice(root.length).replace(/^[\\/]+/, '') : game.arena
}
