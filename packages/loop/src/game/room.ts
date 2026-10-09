/**
 * Games as a project holds them: what the console's Games screen reads and
 * does. A game is a document in the documentation set with a `game:` block;
 * its arena path is relative to the project root.
 *
 * Everything here works from the project's files: listing a game loads and
 * checks it; previewing reads its levels; playing a day plays by rule (no
 * model) against the game's own judge and keeps the store in
 * `.dep-loop/<game id>/`, so each day carries on from the last; saving its
 * rules writes the `game:` block only if the game still loads afterwards.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { parseDocument } from 'yaml'
import { learnedSummary, writeLearnedSummary } from '../riverbed'
import { Store, type StoreEvent } from '../store'
import type { Verdict } from './suite'
import { GameError, loadGame, type LoadedGame } from './game'
import { playSuiteDay } from './play'

export interface GameCheck {
  /** The loader's verdict, by check; a failing check carries the loader's message. */
  checks: Array<{ code: string; passed: boolean; message?: string }>
  /** The judge's step files, relative to the project root. */
  judge: string[]
  playable: boolean
  why?: string
}

export interface GameListing extends GameCheck {
  document: string
  id: string | null
  levels: number
  options: string[]
  situation: Record<string, string>
  levelsExpression: string
  scoring: { pass: number; fail: number; regression: number } | null
  mayWrite: string[]
  arena: string | null
  levelsIndependent: boolean
  /** Days this project has played, oldest first. */
  days: Array<{ day: number; passRate: number; passed: number; failed: number; void: number }>
  /** How many levels a day plays. */
  perDay: number
  /** The policy the judge must encode, as the game document's own When/Then table states it. */
  policy: Array<{ when: string; then: string }>
}

const CHECKS = ['SCORER', 'JUDGE_GROUND', 'ARENA_MISSING', 'SITUATION', 'OPTIONS'] as const
/** The first two-column table in the document's body: what the judge must hold to. */
function policyTable(file: string): GameListing['policy'] {
  const body = readFileSync(file, 'utf-8').replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
  const rows: GameListing['policy'] = []
  for (const line of body.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('|')) { if (rows.length) break; continue }
    const cells = t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    if (cells.length !== 2 || cells.every((c) => /^:?-+:?$/.test(c))) continue
    rows.push({ when: cells[0]!, then: cells[1]! })
  }
  return rows.slice(1)
}

const stateDir = (root: string, id: string) => join(root, '.dep-loop', id.replace(/[^A-Za-z0-9._-]/g, '_'))

function stepFiles(dir: string, root: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? stepFiles(join(dir, e.name), root) : e.name.endsWith('.ts') || e.name.endsWith('.js') ? [join(dir, e.name).slice(root.length + 1)] : [])
}

function days(root: string, id: string): GameListing['days'] {
  const file = join(stateDir(root, id), 'days.json')
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')) : []
}

/** Load and check one game document; never throws for a game that does not load. */
export function describeGame(root: string, document: string): GameListing {
  const base: GameListing = {
    document, id: null, levels: 0, options: [], situation: {}, levelsExpression: '', scoring: null, mayWrite: [],
    arena: null, levelsIndependent: false, days: [], checks: [], judge: [], playable: false, perDay: 0, policy: [],
  }
  let loaded: LoadedGame
  try {
    loaded = loadGame(join(root, document), root)
  } catch (err) {
    const code = err instanceof GameError ? err.code : 'INVALID'
    const message = err instanceof Error ? err.message : String(err)
    // the loader stops at the first failure: checks before it passed, the rest are unknown
    const at = CHECKS.indexOf(code as (typeof CHECKS)[number])
    base.checks = at >= 0
      ? [...CHECKS.slice(0, at).map((c) => ({ code: c, passed: true })), { code, passed: false, message }]
      : [{ code, passed: false, message }]
    base.why = message
    return base
  }
  const { game, levels } = loaded
  const arena = game.arena.startsWith(root) ? game.arena.slice(root.length + 1) : game.arena
  const judge = stepFiles(join(game.arena, 'steps'), root)
  const checks: GameCheck['checks'] = [...CHECKS.map((c) => ({ code: c, passed: true })),
    judge.length ? { code: 'JUDGE', passed: true } : { code: 'JUDGE', passed: false, message: `the judge's steps are missing: nothing in ${arena}/steps; the game cannot be played until they exist` }]
  return {
    ...base,
    id: game.id, levels: levels.length, options: game.actions.options, situation: game.situation,
    levelsExpression: game.levels, scoring: { pass: game.scoring.pass, fail: game.scoring.fail, regression: game.scoring.regression },
    mayWrite: game.actions.mayWrite, arena, levelsIndependent: game.levelsIndependent,
    days: days(root, game.id), checks, judge, playable: judge.length > 0,
    perDay: Math.min(40, levels.length), policy: policyTable(join(root, document)),
    ...(judge.length ? {} : { why: checks.at(-1)!.message }),
  }
}

/** Each level, the situation it is read as, and — for the person designing it — what its scenario expects. */
export function gameLevels(root: string, document: string): Array<{ id: string; name: string; situation: Record<string, string | number | boolean>; expected: string | null }> {
  const { levels, game } = loadGame(join(root, document), root)
  const cache = new Map<string, string[]>()
  return levels.map((level) => {
    const lines = cache.get(level.file) ?? readFileSync(join(root, level.file), 'utf-8').split('\n')
    cache.set(level.file, lines)
    const rowLine = Number(level.id.split(':').at(-1))
    let expected: string | null = null
    if (level.id.split(':').length === 3) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      let h = rowLine - 1
      while (h > 0 && lines[h - 1]!.trim().startsWith('|')) h--
      const header = cells(lines[h]!), row = cells(lines[rowLine - 1]!)
      const situated = new Set(Object.values(game.situation).filter((s) => s.startsWith('row:')).map((s) => s.slice(4)))
      const col = header.findIndex((c) => /^(expected|outcome)$/i.test(c))
      const at = col >= 0 ? col : header.findIndex((c, i) => !situated.has(c) && i === header.length - 1)
      expected = at >= 0 ? row[at] ?? null : null
    }
    return { id: level.id, name: level.name, situation: level.key.features, expected }
  })
}

/** Play one day by rule — no model — and keep what was learned for the next. */
export function playGameDay(root: string, document: string, options: { count?: number } = {}) {
  const listing = describeGame(root, document)
  if (!listing.id) throw new GameError('INVALID', listing.why ?? 'the game cannot be loaded')
  if (!listing.playable) throw new GameError('INVALID', listing.why ?? 'the game cannot be played')
  const loaded = loadGame(join(root, document), root)
  const dir = stateDir(root, listing.id)
  mkdirSync(dir, { recursive: true })
  const logFile = join(dir, 'log.json')
  const log: StoreEvent[] = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf-8')) : []
  const store = log.length ? Store.rebuild(log) : new Store()
  const historyFile = join(dir, 'history.json')
  const history = new Map<string, Verdict>(existsSync(historyFile) ? JSON.parse(readFileSync(historyFile, 'utf-8')) : [])
  const played = days(root, listing.id)
  const day = played.length

  const r = playSuiteDay({ loaded, root, store, seed: 1, day, history, count: options.count })

  writeFileSync(logFile, JSON.stringify(store.log))
  writeFileSync(historyFile, JSON.stringify([...history]))
  const passed = r.episodes.filter((e) => e.verdict === 'passed').length
  const failed = r.episodes.filter((e) => e.verdict === 'failed').length
  played.push({ day, passRate: r.metrics.passRate, passed, failed, void: r.voided.length })
  writeFileSync(join(dir, 'days.json'), JSON.stringify(played, null, 2))
  writeLearnedSummary(root, learnedSummary(store, loaded, [{ label: listing.id, passRates: played.map((d) => d.passRate) }]))
  return { day, passRate: r.metrics.passRate, passed, failed, void: r.voided.length, claims: store.active().length }
}

/** Change a game's options or levels; saved only if the game still loads with the change. */
export function saveGameRules(root: string, document: string, change: { options?: string[]; levels?: string }): GameListing {
  const file = join(root, document)
  const text = readFileSync(file, 'utf-8')
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!m) throw new GameError('NOT_A_GAME', `${document} has no frontmatter`)
  const fm = parseDocument(m[1]!)
  if (change.options) fm.setIn(['game', 'actions', 'options'], change.options)
  if (typeof change.levels === 'string') fm.setIn(['game', 'levels'], change.levels)
  const candidate = `---\n${String(fm).trimEnd()}\n---${text.slice(m[0].length)}`
  // try the change beside the real document, where relative paths still resolve
  const trial = join(dirname(file), `.${basename(file)}.check`)
  writeFileSync(trial, candidate)
  try {
    loadGame(trial, root)
  } finally {
    rmSync(trial, { force: true })
  }
  writeFileSync(file, candidate)
  return describeGame(root, document)
}
