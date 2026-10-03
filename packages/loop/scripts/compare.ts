/**
 * The Phase A measurement: the same days of fresh mazes, played without a
 * store and with one under each key the engine knows. Every number in the
 * design notes comes from this script; cite it with the seeds you ran.
 *
 *   bun packages/loop/scripts/compare.ts                 # seeds 1–6, five days
 *   bun packages/loop/scripts/compare.ts --seeds 8 --days 3
 */
import { Store, playDay, type MazeKeying } from '../src/index'

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const SEEDS = Array.from({ length: arg('seeds', 6) }, (_, i) => i + 1)
const DAYS = arg('days', 5)

const arms: Array<{ name: string; useStore: boolean; keying: MazeKeying }> = [
  { name: 'no store', useStore: false, keying: 'situation' },
  { name: 'store, bare key', useStore: true, keying: 'situation' },
  { name: 'store, + bearing', useStore: true, keying: 'situation+bearing' },
]

const fixed = (xs: number[], places = 2) => xs.map((x) => x.toFixed(places).padStart(5)).join(' ')

console.log(`seeds ${SEEDS[0]}–${SEEDS.at(-1)}, ${DAYS} days, store carried from day to day\n`)
console.log(`${''.padEnd(18)} ${'day'.padEnd(7)}${Array.from({ length: DAYS }, (_, d) => String(d).padStart(5)).join(' ')}`)
for (const arm of arms) {
  const pain = Array(DAYS).fill(0)
  const stretch = Array(DAYS).fill(0)
  const context = Array(DAYS).fill(0)
  for (const seed of SEEDS) {
    const store = new Store()
    for (let day = 0; day < DAYS; day++) {
      const r = playDay({ seed, day, store, useStore: arm.useStore, keying: arm.keying })
      pain[day] += r.metrics.painRate / SEEDS.length
      stretch[day] += r.metrics.meanStretch / SEEDS.length
      context[day] += r.metrics.entriesPerStep / SEEDS.length
    }
  }
  console.log(`${arm.name.padEnd(18)} ${'pain'.padEnd(7)}${fixed(pain)}`)
  console.log(`${''.padEnd(18)} ${'stretch'.padEnd(7)}${fixed(stretch)}`)
  if (arm.useStore) console.log(`${''.padEnd(18)} ${'claims'.padEnd(7)}${fixed(context)}`)
}
