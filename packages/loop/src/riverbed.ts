/**
 * What the agent has learned, written out as a document a person can read.
 *
 * The store is the agent's memory, but a store is numbers. This turns the part
 * of it that has proved itself into a DEP reference: one sentence per claim,
 * the advice it still needs to be told kept apart from the habits it no longer
 * does, and beside each the evidence — how often it was acted on and how often
 * that passed. Those are facts the judge produced.
 *
 * The strength a claim is held at is never written. The document is
 * documentation like any other, so it can be served as context; a strength
 * printed here would reach the player, which the read path exists to prevent.
 *
 * A document someone changed by hand is not overwritten. The body's hash is
 * kept in the frontmatter when it is written; if the body no longer matches it,
 * the person's version stands and they are told.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { dirname, relative, resolve } from 'path'
import { parse as parseYaml, stringify } from 'yaml'
import { configWith, type Config } from './config'
import { keyText } from './key'
import type { Store } from './store'
import type { MemoryEntry } from './types'
import { claimAction } from './write'
import type { LoadedGame } from './game/game'

export interface LearnedOptions {
  store: Store
  loaded: LoadedGame
  /** The project root; the document and the game document are written relative to it. */
  root: string
  /** Where the document goes, relative to the root. */
  path: string
  config?: Partial<Config>
  now?: Date
}

export interface LearnedReport {
  path: string
  written: boolean
  /** The document on disk was changed since it was last written, and was left alone. */
  changedByHand: boolean
  advice: number
  habits: number
}

/** Acted on at least this many times before it is written down. */
export const WRITE_MIN_ACTED = 5

export const hash = (text: string) => createHash('sha256').update(text).digest('hex')

/** Advice that has proved itself: acted on enough, more often right than wrong, and held above where it started. */
export function proven(store: Store, config: Config): { advice: MemoryEntry[]; habits: MemoryEntry[]; taught: MemoryEntry[] } {
  const order = (a: MemoryEntry, b: MemoryEntry) => a.claim.localeCompare(b.claim) || keyText(a.key).localeCompare(keyText(b.key))
  // what a person told it is always shown, with its evidence, whether or not it has held up
  const taught = store.active().filter((e) => e.taught).sort(order)
  const usable = store.active()
    .filter((e) => !e.taught && claimAction(e.claim) !== null)
    .filter((e) => e.gains + e.pains >= WRITE_MIN_ACTED && e.gains / (e.gains + e.pains) >= config.GAIN_RATIO)
  return {
    taught,
    advice: usable.filter((e) => !e.distilled && e.strength > config.S_INIT).sort(order),
    habits: usable.filter((e) => e.distilled).sort(order),
  }
}

export function situation(entry: MemoryEntry, names: string[]): string {
  const f = entry.key.features
  const known = [...names.filter((n) => n in f), ...Object.keys(f).filter((n) => !names.includes(n)).sort()]
  if (known.length === 0) return 'In every situation'
  const parts = known.map((n) => `the ${n} is ${String(f[n])}`)
  return `When ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}`
}

export function line(entry: MemoryEntry, names: string[]): string {
  const acted = entry.gains + entry.pains
  // a claim is followed wherever the situation is near enough, so its evidence is not only from the one it names
  return `- ${situation(entry, names)}: **${entry.claim}**. Acted on ${acted} ${acted === 1 ? 'time' : 'times'} here or somewhere like it; ${entry.gains} passed.`
}

/** The document's body: what it says, without the frontmatter. The same memory always gives the same body. */
export function learnedBody(store: Store, loaded: LoadedGame, config: Config = configWith()): string {
  const { advice, habits, taught } = proven(store, config)
  const names = Object.keys(loaded.game.situation)
  const section = (entries: MemoryEntry[], none: string) => (entries.length ? entries.map((e) => line(e, names)).join('\n') : none)
  return [
    `# What the agent has learned in ${loaded.game.id}`,
    '',
    'Written from the agent\'s memory of playing the game. Only what has been acted on',
    `at least ${WRITE_MIN_ACTED} times, and passed at least as often as it failed, is here.`,
    '',
    '## Advice it relies on',
    '',
    'What the agent is still told when it meets the situation.',
    '',
    section(advice, '_Nothing yet._'),
    '',
    '## Habits',
    '',
    'What it now does without being told.',
    '',
    section(habits, '_None yet._'),
    '',
    '## What you told it',
    '',
    'Advice a person added to this document, tested like any other.',
    '',
    section(taught, '_Nothing yet._'),
    '',
    '## Notes from you',
    '',
    ...(store.notes.length ? store.notes : ['_None yet._']),
    '',
  ].join('\n')
}

export const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function stamp(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * The document as it would be written, without writing it — so it can be
 * proposed for review instead. `text` is null when there is nothing to write:
 * the copy on disk says the same, or was changed by hand.
 */
export function renderLearned(o: LearnedOptions): LearnedReport & { text: string | null } {
  const config = configWith(o.config)
  const full = resolve(o.root, o.path)
  const body = learnedBody(o.store, o.loaded, config)
  const { advice, habits, taught } = proven(o.store, config)
  const report = { path: o.path, advice: advice.length, habits: habits.length, written: false }

  let created: string | undefined
  if (existsSync(full)) {
    const text = readFileSync(full, 'utf-8')
    const m = FRONT.exec(text)
    const fm = (m ? parseYaml(m[1]!) : null) as { dep?: { created?: string }; learned?: { body?: string } } | null
    const onDisk = m ? text.slice(m[0].length) : text
    // a body whose changes the agent has already read is no longer only the person's
    const judged = o.store.judged.has(hash(onDisk))
    if (!judged && (!fm?.learned?.body || fm.learned.body !== hash(onDisk))) return { ...report, changedByHand: true, text: null }
    if (onDisk === body) return { ...report, changedByHand: false, text: null }
    created = fm?.dep?.created
  }

  const gameFm = parseYaml(FRONT.exec(readFileSync(o.loaded.game.document, 'utf-8'))![1]!) as { dep?: { owner?: string; audience?: string[] } }
  const now = stamp(o.now ?? new Date())
  const meta = {
    dep: {
      type: 'reference',
      audience: gameFm.dep?.audience ?? ['ai-agent'],
      owner: gameFm.dep?.owner ?? '@unowned',
      created: created ?? now,
      last_verified: now,
      confidence: 'medium',
      depends_on: [],
      tags: ['learned', 'loop'],
      links: [{ target: relative(dirname(full), o.loaded.game.document).split('\\').join('/'), rel: 'USES' }],
    },
    // which claims each line came from, so a line struck out can be traced to its claim
    learned: { from: o.loaded.game.id, body: hash(body), written: [...advice, ...habits, ...taught].map((e) => e.id).sort() },
  }
  return { ...report, changedByHand: false, text: `---\n${stringify(meta)}---\n${body}` }
}

/** Write the document, unless the copy on disk was changed by hand since it was written. */
export function writeLearned(o: LearnedOptions): LearnedReport {
  const { text, ...report } = renderLearned(o)
  if (text === null) return report
  const full = resolve(o.root, o.path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, text)
  return { ...report, written: true }
}

/** One line of the summary: the situation in words, the advice, and the judge's evidence. Never a strength. */
export interface SummaryLine {
  situation: string
  claim: string
  acted: number
  passed: number
}

/** What the console's learning panel reads: written by the loop, `.dep-learned.json` at the project root. */
export interface LearnedSummary {
  game: string
  updated: string
  /** Pass rate by day, per run — a run with your edits is its own series. */
  runs: Array<{ label: string; passRates: number[] }>
  advice: SummaryLine[]
  habits: SummaryLine[]
  taught: SummaryLine[]
  notes: string[]
  totals: { claims: number; rules: number; habits: number; nightsKept: number; nightsUndone: number }
}

export function learnedSummary(store: Store, loaded: LoadedGame, runs: LearnedSummary['runs'], options: { config?: Partial<Config>; now?: Date } = {}): LearnedSummary {
  const config = configWith(options.config)
  const { advice, habits, taught } = proven(store, config)
  const names = Object.keys(loaded.game.situation)
  const lines = (entries: MemoryEntry[]) => entries.map((e) => ({ situation: situation(e, names), claim: e.claim, acted: e.gains + e.pains, passed: e.gains }))
  const nights = store.log.flatMap((e) => (e.body.type === 'sleep' ? [e.body] : []))
  const active = store.active()
  return {
    game: loaded.game.id,
    updated: (options.now ?? new Date()).toISOString(),
    runs: runs.map((r) => ({ label: r.label, passRates: r.passRates.map((x) => Math.round(x * 100) / 100) })),
    advice: lines(advice), habits: lines(habits), taught: lines(taught), notes: [...store.notes],
    totals: {
      claims: active.length, rules: active.filter((e) => e.kind === 'rule').length, habits: active.filter((e) => e.distilled).length,
      nightsKept: nights.filter((n) => n.slept && !n.undone).length, nightsUndone: nights.filter((n) => n.undone).length,
    },
  }
}

export function writeLearnedSummary(root: string, summary: LearnedSummary): string {
  const file = resolve(root, '.dep-learned.json')
  writeFileSync(file, JSON.stringify(summary, null, 2) + '\n')
  return file
}
