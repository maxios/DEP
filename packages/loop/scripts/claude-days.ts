/**
 * Phase E, live: Claude plays the requests game for a few days, learning as it
 * goes, and what it learned is written out at the end. Needs credentials for
 * the Anthropic API (ANTHROPIC_API_KEY, or an `ant auth login` profile).
 *
 *   bun packages/loop/scripts/claude-days.ts                    # 3 days, claude-opus-5-5 at low effort
 *   bun packages/loop/scripts/claude-days.ts --days 5 --effort medium --count 20
 *
 * Every level is one request: --count levels a day, --days days.
 */
import { cpSync, mkdtempSync, readFileSync, symlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Store, ClaudePlayer, loadGame, playSuiteDayAsync, writeLearned, type Verdict } from '../src/index'

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : fallback
}
const DAYS = Number(arg('days', '3'))
const COUNT = Number(arg('count', '40'))
const effort = arg('effort', 'low') as 'low' | 'medium' | 'high'
const model = arg('model', 'claude-opus-5-5')

const ARENA = join(import.meta.dir, '..', 'arenas', 'requests')
const root = mkdtempSync(join(tmpdir(), 'loop-claude-'))
cpSync(ARENA, root, { recursive: true, filter: (src) => !src.includes('/choices') })
symlinkSync(join(import.meta.dir, '..', 'node_modules'), join(root, 'node_modules'))
const loaded = loadGame(join(root, 'game.md'), root)

const store = new Store()
const history = new Map<string, Verdict>()
const player = new ClaudePlayer({ arena: 'arena', model, effort })
console.log(`${model} at ${effort} effort: ${DAYS} days of ${COUNT} levels (${DAYS * COUNT} requests)\n`)
for (let day = 0; day < DAYS; day++) {
  const r = await playSuiteDayAsync({ loaded, root, store, seed: 1, day, history, player, count: COUNT })
  console.log(`day ${day}: passed ${(r.metrics.passRate * 100).toFixed(0)}%  advice shown per level ${r.metrics.entriesPerStep.toFixed(1)}  void ${r.voided.length}`)
}
writeLearned({ store, loaded, root, path: 'learned.md' })
console.log('\n' + readFileSync(join(root, 'learned.md'), 'utf-8').replace(/^---[\s\S]*?---\n/, ''))
