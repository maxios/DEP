/**
 * The M2 measurement: what the day clock does to a store over many days of
 * fresh mazes — with no clock, fading and putting away only, and the full clock
 * with folding into rules — under each key.
 *
 *   bun packages/loop/scripts/clock.ts                    # seeds 1–6, eight days
 *   bun packages/loop/scripts/clock.ts --from 7           # seeds 7–12: check a result holds
 *   bun packages/loop/scripts/clock.ts --seeds 8 --days 10
 *
 * Differences between seed groups run to about ±0.05 in pain rate, which is
 * larger than most effects worth looking for. Check any result on at least
 * three groups before believing it.
 */
import { Store, playDay, type ClockOptions, type MazeKeying } from '../src/index'

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const SEEDS = Array.from({ length: arg('seeds', 6) }, (_, i) => i + arg('from', 1))
const DAYS = arg('days', 8)
const LATE = Math.floor(DAYS / 2)

const arms: Array<{ name: string; keying: MazeKeying; clock: false | ClockOptions; useStore?: boolean; merge?: number }> = [
  { name: 'no store', keying: 'situation', clock: false, useStore: false },
  { name: 'bare, no clock', keying: 'situation', clock: false },
  { name: 'bare, fade only', keying: 'situation', clock: { fold: false } },
  { name: 'bare, fold @0.7', keying: 'situation', clock: {}, merge: 0.7 },
  { name: 'bearing, no clock', keying: 'situation+bearing', clock: false },
  // 0.8 lets a bearing rule forget only the entry side, never the bearing
  { name: 'bearing, fold @0.8', keying: 'situation+bearing', clock: {}, merge: 0.8 },
]

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

console.log(`seeds ${SEEDS[0]}–${SEEDS.at(-1)}, ${DAYS} days; "late" = days ${LATE}–${DAYS - 1}\n`)
console.log(`${'arm'.padEnd(22)}${'pain late'.padStart(10)}${'reward late'.padStart(13)}${'claims/step'.padStart(13)}${'active'.padStart(8)}${'rules'.padStart(7)}`)
for (const arm of arms) {
  const pain: number[] = []
  const reward: number[] = []
  const context: number[] = []
  const active: number[] = []
  const rules: number[] = []
  for (const seed of SEEDS) {
    const store = new Store()
    for (let day = 0; day < DAYS; day++) {
      const r = playDay({ seed, day, store, keying: arm.keying, clock: arm.clock, useStore: arm.useStore ?? true, config: arm.merge ? { MERGE_SIM: arm.merge } : {} })
      if (day >= LATE) {
        pain.push(r.metrics.painRate)
        reward.push(r.metrics.meanReward)
        context.push(r.metrics.entriesPerStep)
      }
      if (day === DAYS - 1) {
        active.push(r.metrics.activeEntries)
        rules.push(r.metrics.rules)
      }
    }
  }
  console.log(`${arm.name.padEnd(22)}${mean(pain).toFixed(3).padStart(10)}${mean(reward).toFixed(3).padStart(13)}${mean(context).toFixed(2).padStart(13)}${mean(active).toFixed(0).padStart(8)}${mean(rules).toFixed(0).padStart(7)}`)
}
