/**
 * Does the memory become legible? The requests game with nights, under the
 * current novelty check and under one that refuses only what is already
 * covered, so that similar claims are kept long enough for the day clock to
 * fold them into rules.
 *
 *   bun packages/loop/scripts/legible.ts                 # seeds 1–4, ten days
 *   bun packages/loop/scripts/legible.ts --from 5
 */
import { cpSync, mkdtempSync, symlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Store, Instincts, loadGame, playSuiteDay, sleepNight, suiteHeldOut, proven, configWith, type Config, type Verdict, type VerdictCache } from '../src/index'

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const SEEDS = Array.from({ length: arg('seeds', 4) }, (_, i) => i + arg('from', 1))
const DAYS = arg('days', 10)
const ARENA = join(import.meta.dir, '..', 'arenas', 'requests')
const root = mkdtempSync(join(tmpdir(), 'loop-legible-'))
cpSync(ARENA, root, { recursive: true, filter: (src) => !src.includes('/choices') })
symlinkSync(join(import.meta.dir, '..', 'node_modules'), join(root, 'node_modules'))
const loaded = loadGame(join(root, 'game.md'), root)
const sorted = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id))
const heldOut = sorted.filter((_, i) => i % 6 === 0)
const heldOutIds = new Set(heldOut.map((l) => l.id))

// a verdict is keyed by the judge's fingerprint, the level and the answer, so every seed and arm can share them
const cache: VerdictCache = new Map()

const ARMS: Array<[string, Partial<Config>]> = [['novel 0.7', {}], ['covered', { NOVEL: 1 }]]
console.log(`requests game with nights, seeds ${SEEDS[0]}–${SEEDS.at(-1)}, ${DAYS} days; values on the last day\n`)
console.log(`${''.padEnd(12)}${['pass', 'held-out', 'lines', 'rules', 'general', 'no area'].map((h) => h.padStart(10)).join('')}`)
for (const [name, overrides] of ARMS) {
  const config = configWith(overrides)
  const t = { pass: 0, held: 0, lines: 0, rules: 0, general: 0, noArea: 0 }
  for (const seed of SEEDS) {
    const store = new Store()
    const instincts = Instincts.start()
    const history = new Map<string, Verdict>()
    const proving = suiteHeldOut({ loaded, root, store, levels: heldOut, seed, cache, config: overrides })
    let pass = 0
    for (let day = 0; day < DAYS; day++) {
      const r = playSuiteDay({ loaded, root, store, seed, day, history, heldOut: heldOutIds, instincts: instincts.current(), cache, config: overrides })
      pass = r.metrics.passRate
      sleepNight({ store, instincts, day: r, seed, heldOut: proving, config: overrides })
    }
    const { advice, habits } = proven(store, config)
    const written = [...advice, ...habits]
    const n = SEEDS.length
    t.pass += pass / n
    t.held += proving.play({ instincts: instincts.current(), hidden: new Set() }).reward / n
    t.lines += written.length / n
    t.rules += store.active().filter((e) => e.kind === 'rule').length / n
    t.general += written.filter((e) => e.kind === 'rule').length / n
    t.noArea += written.filter((e) => !('area' in e.key.features)).length / n
  }
  console.log(`${name.padEnd(12)}${[t.pass, t.held].map((x) => x.toFixed(2).padStart(10)).join('')}${[t.lines, t.rules, t.general, t.noArea].map((x) => x.toFixed(1).padStart(10)).join('')}`)
}
