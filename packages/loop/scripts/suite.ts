/**
 * The Phase B measurement: the requests game played without a store, with a
 * store but no day clock, and with the full clock — pass rate per day.
 *
 *   bun packages/loop/scripts/suite.ts                   # seeds 1–4, eight days
 *   bun packages/loop/scripts/suite.ts --from 5 --days 8
 *
 * Each day is one Cucumber run over forty levels, so this takes a few minutes.
 */
import { join } from 'path'
import { Store, loadGame, playSuiteDay, type ClockOptions, type Verdict } from '../src/index'

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const SEEDS = Array.from({ length: arg('seeds', 4) }, (_, i) => i + arg('from', 1))
const DAYS = arg('days', 8)
const ROOT = join(import.meta.dir, '..', 'arenas', 'requests')
const loaded = loadGame(join(ROOT, 'game.md'), ROOT)

const arms: Array<{ name: string; useStore: boolean; clock: false | ClockOptions }> = [
  { name: 'no store', useStore: false, clock: false },
  { name: 'store, no clock', useStore: true, clock: false },
  { name: 'store, full clock', useStore: true, clock: {} },
]

const fixed = (xs: number[]) => xs.map((x) => x.toFixed(2).padStart(6)).join('')
console.log(`requests game, ${loaded.levels.length} levels, seeds ${SEEDS[0]}–${SEEDS.at(-1)}, ${DAYS} days of 40\n`)
console.log(`${''.padEnd(28)}${Array.from({ length: DAYS }, (_, d) => String(d).padStart(6)).join('')}`)
for (const arm of arms) {
  const pass = Array(DAYS).fill(0) as number[]
  const claims = Array(DAYS).fill(0) as number[]
  const rules = Array(DAYS).fill(0) as number[]
  for (const seed of SEEDS) {
    const store = new Store()
    const history = new Map<string, Verdict>()
    for (let day = 0; day < DAYS; day++) {
      const r = playSuiteDay({ loaded, root: ROOT, store, seed, day, useStore: arm.useStore, clock: arm.clock, history })
      pass[day]! += r.metrics.passRate / SEEDS.length
      claims[day]! += r.metrics.activeEntries / SEEDS.length
      rules[day]! += r.metrics.rules / SEEDS.length
    }
  }
  console.log(`${arm.name.padEnd(18)}${'pass'.padEnd(10)}${fixed(pass)}`)
  if (arm.useStore) {
    console.log(`${''.padEnd(18)}${'claims'.padEnd(10)}${fixed(claims)}`)
    console.log(`${''.padEnd(18)}${'rules'.padEnd(10)}${fixed(rules)}`)
  }
}
