/**
 * Sleep on the requests game: the same days with and without a night after
 * each, every sixth level kept back for the nights to judge on.
 *
 *   bun packages/loop/scripts/suite-sleep.ts                  # seeds 1–4, ten days
 *   bun packages/loop/scripts/suite-sleep.ts --from 5
 */
import { join } from 'path'
import { Store, Instincts, loadGame, playSuiteDay, sleepNight, suiteHeldOut, type Verdict, type VerdictCache } from '../src/index'

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const SEEDS = Array.from({ length: arg('seeds', 4) }, (_, i) => i + arg('from', 1))
const DAYS = arg('days', 10)
const ROOT = join(import.meta.dir, '..', 'arenas', 'requests')
const loaded = loadGame(join(ROOT, 'game.md'), ROOT)
const sorted = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id))
const heldOut = sorted.filter((_, i) => i % 6 === 0)
const heldOutIds = new Set(heldOut.map((l) => l.id))

const fixed = (xs: number[], places = 2) => xs.map((x) => x.toFixed(places).padStart(6)).join('')
console.log(`requests game, ${loaded.levels.length - heldOut.length} levels by day, ${heldOut.length} kept for nights, seeds ${SEEDS[0]}–${SEEDS.at(-1)}\n`)
console.log(`${''.padEnd(24)}${Array.from({ length: DAYS }, (_, d) => String(d).padStart(6)).join('')}`)
for (const nights of [false, true]) {
  const pass = Array(DAYS).fill(0) as number[]
  const shown = Array(DAYS).fill(0) as number[]
  const held = Array(DAYS).fill(0) as number[]
  const absorbed = Array(DAYS).fill(0) as number[]
  let kept = 0, undone = 0, refused = 0
  for (const seed of SEEDS) {
    const store = new Store()
    const instincts = Instincts.start()
    const history = new Map<string, Verdict>()
    const cache: VerdictCache = new Map()
    const proving = suiteHeldOut({ loaded, root: ROOT, store, levels: heldOut, seed, cache })
    for (let day = 0; day < DAYS; day++) {
      const r = playSuiteDay({ loaded, root: ROOT, store, seed, day, history, heldOut: heldOutIds, instincts: instincts.current(), cache })
      pass[day]! += r.metrics.passRate / SEEDS.length
      shown[day]! += r.metrics.entriesPerStep / SEEDS.length
      if (nights) {
        const n = sleepNight({ store, instincts, day: r, seed, heldOut: proving })
        if (n.undone) undone++
        else if (n.slept) kept++
        else refused++
      }
      held[day]! += proving.play({ instincts: instincts.current(), hidden: new Set() }).reward / SEEDS.length
      absorbed[day]! += [...store.entries.values()].filter((e) => e.distilled).length / SEEDS.length
    }
  }
  const label = nights ? 'with nights' : 'no nights'
  console.log(`${label.padEnd(12)}${'pass'.padEnd(12)}${fixed(pass)}`)
  console.log(`${''.padEnd(12)}${'held-out'.padEnd(12)}${fixed(held)}`)
  console.log(`${''.padEnd(12)}${'shown'.padEnd(12)}${fixed(shown)}`)
  if (nights) {
    console.log(`${''.padEnd(12)}${'absorbed'.padEnd(12)}${fixed(absorbed, 0)}`)
    console.log(`${''.padEnd(12)}nights: ${kept} kept, ${undone} undone, ${refused} not slept on`)
  }
}
