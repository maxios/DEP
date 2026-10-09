/**
 * Play the requests game with a night after each day, then write out what the
 * agent learned and print it.
 *
 *   bun packages/loop/scripts/learned.ts                 # seed 1, eight days
 *   bun packages/loop/scripts/learned.ts --seed 5 --days 10 --out learned.md
 */
import { cpSync, mkdtempSync, readFileSync, symlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { Store, Instincts, loadGame, playSuiteDay, sleepNight, suiteHeldOut, writeLearned, type Verdict, type VerdictCache } from '../src/index'

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : fallback
}
const SEED = Number(arg('seed', '1'))
const DAYS = Number(arg('days', '8'))
const ARENA = join(import.meta.dir, '..', 'arenas', 'requests')

// played in a copy, so the arena in the repository is never written to
const root = mkdtempSync(join(tmpdir(), 'loop-learned-'))
cpSync(ARENA, root, { recursive: true, filter: (src) => !src.includes('/choices') })
symlinkSync(join(import.meta.dir, '..', 'node_modules'), join(root, 'node_modules'))
const loaded = loadGame(join(root, 'game.md'), root)
const sorted = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id))
const heldOut = sorted.filter((_, i) => i % 6 === 0)
const heldOutIds = new Set(heldOut.map((l) => l.id))

const store = new Store()
const instincts = Instincts.start()
const history = new Map<string, Verdict>()
const cache: VerdictCache = new Map()
const proving = suiteHeldOut({ loaded, root, store, levels: heldOut, seed: SEED, cache })
for (let day = 0; day < DAYS; day++) {
  const r = playSuiteDay({ loaded, root, store, seed: SEED, day, history, heldOut: heldOutIds, instincts: instincts.current(), cache })
  sleepNight({ store, instincts, day: r, seed: SEED, heldOut: proving })
}

const out = resolve(arg('out', join(root, 'learned.md')))
const report = writeLearned({ store, loaded, root, path: out })
if (report.changedByHand) console.error(`${out} was changed by hand since it was written; left as it is`)
console.log(readFileSync(out, 'utf-8'))
console.error(`${report.advice} pieces of advice, ${report.habits} habits → ${out}`)
