/**
 * The M3 measurement: the same days of fresh mazes with and without nights.
 * The spec's success criterion is that claims in context rise, then fall, as
 * what they taught moves into the instincts — without the player getting worse.
 *
 *   bun packages/loop/scripts/sleep.ts                  # seeds 1–6, twelve days
 *   bun packages/loop/scripts/sleep.ts --from 7         # another seed group
 */
import { Store, Instincts, playDay, sleepNight } from '../src/index'

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const SEEDS = Array.from({ length: arg('seeds', 6) }, (_, i) => i + arg('from', 1))
const DAYS = arg('days', 12)

const fixed = (xs: number[], places = 2) => xs.map((x) => x.toFixed(places).padStart(6)).join('')
const zeros = () => Array(DAYS).fill(0) as number[]

console.log(`seeds ${SEEDS[0]}–${SEEDS.at(-1)}, ${DAYS} days\n`)
console.log(`${''.padEnd(24)}${Array.from({ length: DAYS }, (_, d) => String(d).padStart(6)).join('')}`)
for (const nights of [false, true]) {
  const claims = zeros(), pain = zeros(), reward = zeros(), instincts = zeros(), absorbed = zeros()
  let slept = 0, undone = 0, refused = 0
  for (const seed of SEEDS) {
    const store = new Store()
    const registry = Instincts.start()
    for (let day = 0; day < DAYS; day++) {
      const r = playDay({ seed, day, store, instincts: registry.current() })
      claims[day]! += r.metrics.entriesPerStep / SEEDS.length
      pain[day]! += r.metrics.painRate / SEEDS.length
      reward[day]! += r.metrics.meanReward / SEEDS.length
      if (nights) {
        const night = sleepNight({ store, instincts: registry, day: r, seed })
        if (night.undone) undone++
        else if (night.slept) slept++
        else refused++
      }
      instincts[day]! += registry.current().instincts.length / SEEDS.length
      absorbed[day]! += [...store.entries.values()].filter((e) => e.distilled).length / SEEDS.length
    }
  }
  const label = nights ? 'with nights' : 'no nights'
  console.log(`${label.padEnd(12)}${'claims'.padEnd(12)}${fixed(claims)}`)
  console.log(`${''.padEnd(12)}${'pain'.padEnd(12)}${fixed(pain)}`)
  console.log(`${''.padEnd(12)}${'reward'.padEnd(12)}${fixed(reward)}`)
  if (nights) {
    console.log(`${''.padEnd(12)}${'instincts'.padEnd(12)}${fixed(instincts, 0)}`)
    console.log(`${''.padEnd(12)}${'absorbed'.padEnd(12)}${fixed(absorbed, 0)}`)
    console.log(`${''.padEnd(12)}nights: ${slept} kept, ${undone} undone, ${refused} not slept on`)
  }
}
