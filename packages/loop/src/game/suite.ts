/**
 * The judge of a game: run the arena's scenarios with Cucumber and read back
 * which passed. The verdicts come from Cucumber's own message stream, written
 * outside the arena — never from a file the arena or the player could write.
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import type { Game, Level } from './game'

export type Verdict = 'passed' | 'failed'

const CUCUMBER = resolve(import.meta.dir, '..', '..', 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js')

interface Envelope {
  gherkinDocument?: { uri: string; feature?: { children: Array<{ scenario?: { id: string; location: { line: number }; examples: Array<{ tableBody: Array<{ id: string; location: { line: number } }> }> } }> } }
  pickle?: { id: string; uri: string; astNodeIds: string[] }
  testCase?: { id: string; pickleId: string }
  testCaseStarted?: { id: string; testCaseId: string }
  testStepFinished?: { testCaseStartedId: string; testStepResult: { status: string } }
}

/** Run the given levels; every level gets a verdict, a level Cucumber did not report fails. */
export function judge(root: string, game: Game, levels: Level[]): Map<string, Verdict> {
  const verdicts = new Map<string, Verdict>(levels.map((l) => [l.id, 'failed']))
  if (levels.length === 0) return verdicts
  const out = mkdtempSync(join(tmpdir(), 'loop-judge-'))
  const messages = join(out, 'messages.ndjson')
  try {
    const targets = [...new Set(levels.map((l) => `${l.file}:${l.line}`))]
    const run = spawnSync('bun', ['--bun', CUCUMBER,
      '--import', `${relativeArena(root, game)}/steps/**/*.ts`,
      '--format', `message:${messages}`,
      ...targets,
    ], { cwd: root, encoding: 'utf-8', env: { ...process.env, FORCE_COLOR: '0' } })
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
    return verdicts
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

function relativeArena(root: string, game: Game): string {
  return game.arena.startsWith(root) ? game.arena.slice(root.length).replace(/^[\\/]+/, '') : game.arena
}
