/**
 * Phase F: does a person's edit to the learned document help, and what does a
 * wrong one cost? Five days with nights, then the document is edited and read
 * back, then five more days.
 *
 *   bun packages/loop/scripts/teach.ts --from 1|5|9
 */
import { cpSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Store, Instincts, loadGame, playSuiteDay, sleepNight, suiteHeldOut, writeLearned, readJudgement, type Verdict, type VerdictCache } from '../src/index'

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const SEEDS = Array.from({ length: 4 }, (_, i) => i + arg('from', 1))
const ARENA = join(import.meta.dir, '..', 'arenas', 'requests')
const root = mkdtempSync(join(tmpdir(), 'loop-teach-'))
cpSync(ARENA, root, { recursive: true, filter: (src) => !src.includes('/choices') })
symlinkSync(join(import.meta.dir, '..', 'node_modules'), join(root, 'node_modules'))
const loaded = loadGame(join(root, 'game.md'), root)
const sorted = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id))
const heldOut = sorted.filter((_, i) => i % 6 === 0)
const ids = new Set(heldOut.map((l) => l.id))
const cache: VerdictCache = new Map()

// the arena's hidden exceptions, as a person who knows the policy would write them
const RIGHT = [
  '- When the size is large and the tier is new: **choose refuse**.',
  '- When the size is small, the currency is USD and the tier is new: **choose defer**.',
  '- When the size is medium, the currency is USD and the tier is new: **choose defer**.',
  '- When the kind is validation: **choose refuse**.',
]
const WRONG = ['- When the tier is new: **choose accept**.']
const ARMS: Array<[string, string[] | null]> = [['no edit', null], ['right', RIGHT], ['wrong', WRONG]]

console.log(`requests game, seeds ${SEEDS[0]}–${SEEDS.at(-1)}: five days, an edit, five more\n`)
console.log(`${''.padEnd(10)}${['pass d4', 'pass d9', 'held d4', 'held d9', 'told acted', 'told passed'].map((h) => h.padStart(12)).join('')}`)
for (const [name, lines] of ARMS) {
  const t = { p4: 0, p9: 0, h4: 0, h9: 0, acted: 0, passed: 0 }
  for (const seed of SEEDS) {
    const store = new Store(), instincts = Instincts.start(), history = new Map<string, Verdict>()
    const proving = suiteHeldOut({ loaded, root, store, levels: heldOut, seed, cache })
    const path = `learned-${name.replace(/ /g, "-")}-${seed}.md`
    for (let day = 0; day < 10; day++) {
      if (day === 5 && lines) {
        writeLearned({ store, loaded, root, path })
        const text = readFileSync(join(root, path), 'utf-8')
        writeFileSync(join(root, path), text.replace('## What you told it\n', `## What you told it\n\n${lines.join('\n')}\n`))
        readJudgement({ store, loaded, root, path, instincts })
      }
      const r = playSuiteDay({ loaded, root, store, seed, day, history, heldOut: ids, instincts: instincts.current(), cache })
      sleepNight({ store, instincts, day: r, seed, heldOut: proving })
      const held = proving.play({ instincts: instincts.current(), hidden: new Set() }).reward
      if (day === 4) { t.p4 += r.metrics.passRate / 4; t.h4 += held / 4 }
      if (day === 9) { t.p9 += r.metrics.passRate / 4; t.h9 += held / 4 }
    }
    for (const e of store.active().filter((x) => x.taught)) { t.acted += (e.gains + e.pains) / 4; t.passed += e.gains / 4 }
  }
  console.log(`${name.padEnd(10)}${[t.p4, t.p9, t.h4, t.h9].map((x) => x.toFixed(2).padStart(12)).join('')}${[t.acted, t.passed].map((x) => x.toFixed(1).padStart(12)).join('')}`)
}
