/**
 * A game, read from its document.
 *
 * The rules of a game live in a DEP reference document, in a `game:` block
 * beside its `dep:` block — so they have an owner, a review cadence and a
 * validator like any other documentation. The levels are Gherkin scenarios,
 * and the scenarios are the only judge: the document is refused if it names
 * any other scorer, or lets the player write anywhere the judge lives.
 *
 *   arena      a directory with features/ (the levels) and steps/ (the judge)
 *   levels     a tag expression choosing which scenarios are in play
 *   situation  what makes two levels the same situation, feature by feature:
 *                tag:<pattern>   the first of a scenario's tags matching it
 *                row:<column>    that column of an outline's example row
 *                given           the scenario's Given steps
 *   actions    where the player may write, where it may not, and — for a
 *              player that chooses rather than writes — the options it has
 *   scoring    what passing, failing and breaking a level that passed is worth
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'
import { parse as parseYaml } from 'yaml'
import { AstBuilder, GherkinClassicTokenMatcher, Parser, compile } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
import parseTagExpression from '@cucumber/tag-expressions'
import type { SituationKey } from '../types'

export type GameErrorCode = 'NOT_A_GAME' | 'SCORER' | 'JUDGE_GROUND' | 'ARENA_MISSING' | 'SITUATION' | 'INVALID'

export class GameError extends Error {
  constructor(readonly code: GameErrorCode, message: string) {
    super(message)
    this.name = 'GameError'
  }
}

export interface Scoring {
  authority: 'suite'
  pass: number
  fail: number
  regression: number
  costPer1kTokens: number
}

export interface Game {
  id: string
  /** Absolute path of the arena. */
  arena: string
  levels: string
  situation: Record<string, string>
  actions: { mayWrite: string[]; neverWrite: string[]; options: string[] }
  scoring: Scoring
  /** The document the game was read from. */
  document: string
}

export interface Level {
  /** Stable: the feature file, the scenario's line, and the example row's line. */
  id: string
  name: string
  file: string
  line: number
  tags: string[]
  key: SituationKey
}

export interface LoadedGame {
  game: Game
  levels: Level[]
}

function frontmatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf-8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) throw new GameError('NOT_A_GAME', `${path} has no frontmatter`)
  return (parseYaml(match[1]!) ?? {}) as Record<string, unknown>
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

/** The part of a glob before its first wildcard — what it can reach at the least. */
function base(pattern: string): string {
  const cut = pattern.search(/[*?[{]/)
  return (cut < 0 ? pattern : pattern.slice(0, cut)).replace(/\/+$/, '')
}

/** Conservative: two globs overlap when either one's fixed prefix lies inside the other's. */
function overlaps(a: string, b: string): boolean {
  const x = base(a)
  const y = base(b)
  return x === y || x.startsWith(y + '/') || y.startsWith(x + '/') || x === '' || y === ''
}

function files(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...files(full, ext))
    else if (name.endsWith(ext)) out.push(full)
  }
  return out
}

function featureValue(source: string, pickleTags: string[], row: Record<string, string> | null, givens: string[]): string | undefined {
  if (source.startsWith('tag:')) {
    const pattern = new RegExp(`^(?:${source.slice(4)})$`)
    const tag = pickleTags.map((t) => t.replace(/^@/, '')).find((t) => pattern.test(t))
    return tag
  }
  if (source.startsWith('row:')) return row?.[source.slice(4)]
  if (source === 'given') return givens.length ? givens.join(' / ') : undefined
  return undefined
}

export function loadGame(documentPath: string, root: string): LoadedGame {
  const fm = frontmatter(documentPath)
  const block = fm.game as Record<string, unknown> | undefined
  if (!block || typeof block !== 'object') throw new GameError('NOT_A_GAME', `${documentPath} has no game: block`)

  const scoringRaw = (block.scoring ?? {}) as Record<string, unknown>
  if (scoringRaw.authority !== 'suite') {
    throw new GameError('SCORER', `the scenarios must be the only judge: scoring.authority is "${String(scoringRaw.authority)}", and only "suite" is accepted`)
  }

  const arenaRel = String(block.arena ?? '')
  const arena = resolve(root, arenaRel)
  if (!arenaRel || !existsSync(arena) || !existsSync(join(arena, 'features'))) {
    throw new GameError('ARENA_MISSING', `the arena cannot be found: ${arenaRel || '(none named)'} needs a features/ directory under ${root}`)
  }

  const actionsRaw = (block.actions ?? {}) as Record<string, unknown>
  const mayWrite = strings(actionsRaw.may_write)
  const neverWrite = strings(actionsRaw.never_write)
  // the scenarios and their steps are the judge, whether or not the document says so
  const judgeGround = [`${arenaRel}/features/**`, `${arenaRel}/steps/**`, ...neverWrite]
  for (const writable of mayWrite) {
    const reached = judgeGround.find((ground) => overlaps(writable, ground))
    if (reached) throw new GameError('JUDGE_GROUND', `the player may not write where it is judged: "${writable}" reaches "${reached}"`)
  }

  const situation = (block.situation ?? {}) as Record<string, string>
  for (const [name, source] of Object.entries(situation)) {
    if (!/^(tag:.+|row:.+|given)$/.test(String(source))) {
      throw new GameError('SITUATION', `the situation's "${name}" cannot be read: "${source}" is not tag:<pattern>, row:<column> or given`)
    }
  }

  const levelsExpr = String(block.levels ?? '')
  let select: (tags: string[]) => boolean
  try {
    const expr = parseTagExpression(levelsExpr || 'not @never-a-tag')
    select = (tags) => expr.evaluate(tags)
  } catch (err) {
    throw new GameError('INVALID', `the levels expression "${levelsExpr}" cannot be read: ${(err as Error).message}`)
  }

  const levels: Level[] = []
  for (const file of files(join(arena, 'features'), '.feature')) {
    const uri = relative(root, file).split('\\').join('/')
    const newId = IdGenerator.incrementing()
    const doc = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher()).parse(readFileSync(file, 'utf-8'))
    const lines = new Map<string, number>()
    const rows = new Map<string, Record<string, string>>()
    const visit = (children: NonNullable<typeof doc.feature>['children']) => {
      for (const child of children) {
        if (child.rule) visit(child.rule.children as typeof children)
        const scenario = child.scenario
        if (!scenario) continue
        lines.set(scenario.id, scenario.location.line)
        for (const examples of scenario.examples) {
          const header = examples.tableHeader?.cells.map((c) => c.value) ?? []
          for (const row of examples.tableBody) {
            lines.set(row.id, row.location.line)
            rows.set(row.id, Object.fromEntries(header.map((h, i) => [h, row.cells[i]?.value ?? ''])))
          }
        }
      }
    }
    if (doc.feature) visit(doc.feature.children)

    for (const pickle of compile(doc, uri, newId)) {
      const tags = pickle.tags.map((t) => t.name)
      if (!select(tags)) continue
      const [scenarioId, rowId] = pickle.astNodeIds
      const row = rowId ? rows.get(rowId) ?? null : null
      const givens = pickle.steps.filter((s) => s.type === 'Context').map((s) => s.text)
      const features: Record<string, string> = {}
      for (const [name, source] of Object.entries(situation)) {
        const value = featureValue(String(source), tags, row, givens)
        if (value !== undefined) features[name] = value
      }
      const line = lines.get(scenarioId!) ?? 0
      levels.push({
        id: rowId ? `${uri}:${line}:${lines.get(rowId)}` : `${uri}:${line}`,
        name: pickle.name,
        file: uri,
        line: rowId ? lines.get(rowId)! : line,
        tags,
        key: { features },
      })
    }
  }

  // a feature no level can supply describes nothing
  for (const [name, source] of Object.entries(situation)) {
    if (!levels.some((l) => name in l.key.features)) {
      throw new GameError('SITUATION', `the situation's "${name}" cannot be read: no level in play has anything for ${source}`)
    }
  }

  const number = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback)
  return {
    game: {
      id: String(block.id ?? ''),
      arena,
      levels: levelsExpr,
      situation,
      actions: { mayWrite, neverWrite, options: strings(actionsRaw.options) },
      scoring: {
        authority: 'suite',
        pass: number(scoringRaw.pass, 1),
        fail: number(scoringRaw.fail, -1),
        regression: number(scoringRaw.regression, -2),
        costPer1kTokens: number(scoringRaw.cost_per_1k_tokens, 0),
      },
      document: documentPath,
    },
    levels,
  }
}
