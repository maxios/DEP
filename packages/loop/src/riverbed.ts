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

const hash = (text: string) => createHash('sha256').update(text).digest('hex')

/** Advice that has proved itself: acted on enough, more often right than wrong, and held above where it started. */
export function proven(store: Store, config: Config): { advice: MemoryEntry[]; habits: MemoryEntry[] } {
  const usable = store.active()
    .filter((e) => claimAction(e.claim) !== null)
    .filter((e) => e.gains + e.pains >= WRITE_MIN_ACTED && e.gains / (e.gains + e.pains) >= config.GAIN_RATIO)
  const order = (a: MemoryEntry, b: MemoryEntry) => a.claim.localeCompare(b.claim) || keyText(a.key).localeCompare(keyText(b.key))
  return {
    advice: usable.filter((e) => !e.distilled && e.strength > config.S_INIT).sort(order),
    habits: usable.filter((e) => e.distilled).sort(order),
  }
}

function situation(entry: MemoryEntry, names: string[]): string {
  const f = entry.key.features
  const known = [...names.filter((n) => n in f), ...Object.keys(f).filter((n) => !names.includes(n)).sort()]
  if (known.length === 0) return 'In every situation'
  const parts = known.map((n) => `the ${n} is ${String(f[n])}`)
  return `When ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}`
}

function line(entry: MemoryEntry, names: string[]): string {
  const acted = entry.gains + entry.pains
  // a claim is followed wherever the situation is near enough, so its evidence is not only from the one it names
  return `- ${situation(entry, names)}: **${entry.claim}**. Acted on ${acted} ${acted === 1 ? 'time' : 'times'} here or somewhere like it; ${entry.gains} passed.`
}

/** The document's body: what it says, without the frontmatter. The same memory always gives the same body. */
export function learnedBody(store: Store, loaded: LoadedGame, config: Config = configWith()): string {
  const { advice, habits } = proven(store, config)
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
  ].join('\n')
}

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function stamp(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Write the document, unless the copy on disk was changed by hand since it was written. */
export function writeLearned(o: LearnedOptions): LearnedReport {
  const config = configWith(o.config)
  const full = resolve(o.root, o.path)
  const body = learnedBody(o.store, o.loaded, config)
  const { advice, habits } = proven(o.store, config)
  const report = { path: o.path, advice: advice.length, habits: habits.length }

  let created: string | undefined
  if (existsSync(full)) {
    const text = readFileSync(full, 'utf-8')
    const m = FRONT.exec(text)
    const fm = (m ? parseYaml(m[1]!) : null) as { dep?: { created?: string }; learned?: { body?: string } } | null
    const onDisk = m ? text.slice(m[0].length) : text
    if (!fm?.learned?.body || fm.learned.body !== hash(onDisk)) return { ...report, written: false, changedByHand: true }
    if (onDisk === body) return { ...report, written: false, changedByHand: false }
    created = fm.dep?.created
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
    learned: { from: o.loaded.game.id, body: hash(body) },
  }
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, `---\n${stringify(meta)}---\n${body}`)
  return { ...report, written: true, changedByHand: false }
}
