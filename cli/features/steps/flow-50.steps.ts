import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { DepWorld } from '../support/world'
import {
  Store, Instincts, loadGame, playSuiteDay, sleepNight, suiteHeldOut, judge, gate, configWith, choicePath,
  type Adapter, type Level, type LoadedGame, type SuiteDayResult, type Trainer, type TrainJob, type Verdict, type VerdictCache,
} from '../../../packages/loop/src/index'
import { game } from './flow-48.steps'

const SEED = 1
const config = configWith()

/** Every sixth level is kept for the night; the days never see it. */
function split(loaded: LoadedGame): { heldOut: Level[]; heldOutIds: Set<string> } {
  const sorted = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id))
  const heldOut = sorted.filter((_, i) => i % 6 === 0)
  return { heldOut, heldOutIds: new Set(heldOut.map((l) => l.id)) }
}

Given('several days of the game that were going well', function (this: DepWorld) {
  const { root, loaded } = game(this)
  const { heldOut, heldOutIds } = split(loaded)
  const store = new Store()
  const instincts = Instincts.start()
  const history = new Map<string, Verdict>()
  const cache: VerdictCache = new Map()
  const played = new Set<string>()
  let day: SuiteDayResult | undefined
  for (let d = 0; d < 4; d++) {
    day = playSuiteDay({ loaded, root, store, seed: SEED, day: d, history, heldOut: heldOutIds, instincts: instincts.current(), cache })
    for (const e of day.episodes) played.add(e.level)
  }
  const verdict = gate(day!, config)
  assert.ok(verdict.open, `the fixture's last day does not pass the gate: ${verdict.reason}`)
  Object.entries({ store, instincts, history, cache, played, heldOut, day: day! }).forEach(([k, v]) => this.notes.set(k, v))
  this.notes.set('wentToSleepWith', instincts.current().version)
})

/** Learns nothing it was shown — one answer, everywhere. */
class OneAnswer implements Trainer {
  train(job: TrainJob): Adapter {
    return Instincts.version(job.version, job.from.version, [{ key: { features: {} }, action: 'accept', from: 'nowhere' }])
  }
}

Given('a trainer that teaches only one answer for everything', function (this: DepWorld) {
  this.notes.set('trainer', new OneAnswer())
})

When('the night comes after the last of them', function (this: DepWorld) {
  const { root, loaded } = game(this)
  const proving = suiteHeldOut({
    loaded, root, store: this.notes.get('store') as Store, levels: this.notes.get('heldOut') as Level[],
    seed: SEED, cache: this.notes.get('cache') as VerdictCache,
  })
  this.notes.set('proving', proving)
  this.notes.set('night', sleepNight({
    store: this.notes.get('store') as Store,
    instincts: this.notes.get('instincts') as Instincts,
    day: this.notes.get('day') as SuiteDayResult,
    seed: SEED,
    heldOut: proving,
    trainer: this.notes.get('trainer') as Trainer | undefined,
  }))
})

Then('every level the night judged on is one no day played', function (this: DepWorld) {
  const judged = (this.notes.get('proving') as ReturnType<typeof suiteHeldOut>).judged
  const played = this.notes.get('played') as Set<string>
  assert.ok(judged.size > 0, 'the night judged nothing')
  for (const level of judged) assert.ok(!played.has(level), `${level} was played by a day`)
})

// ── reusing a verdict ───────────────────────────────────────────────────

Given('a game whose levels each read only their own answer', function (this: DepWorld) {
  const { loaded } = game(this)
  assert.equal(loaded.game.levelsIndependent, true, 'the reference game does not promise it')
})

Given('a game that does not say its levels stand alone', function (this: DepWorld) {
  const { root } = game(this)
  const doc = join(root, 'game-without-promise.md')
  writeFileSync(doc, readFileSync(join(root, 'game.md'), 'utf-8').replace(/\n  levels_independent: true/, ''))
  const loaded = loadGame(doc, root)
  assert.equal(loaded.game.levelsIndependent, false)
  this.notes.set('loaded', loaded)
})

function answerAndJudge(world: DepWorld) {
  const { root, loaded } = game(world)
  const levels = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 10)
  const answers = new Map<string, string>()
  for (const level of levels) {
    const path = choicePath('arena', level.id)
    const content = JSON.stringify({ option: 'convert' })
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
    answers.set(level.id, JSON.stringify([{ path, content }]))
  }
  const cache = (world.notes.get('verdictCache') as VerdictCache | undefined) ?? new Map()
  const stats = (world.notes.get('stats') as { runs: number } | undefined) ?? { runs: 0 }
  world.notes.set('verdictCache', cache)
  world.notes.set('stats', stats)
  judge(root, loaded.game, levels, { answers, cache, stats })
}

When('the same answers are judged twice', function (this: DepWorld) {
  answerAndJudge(this)
  answerAndJudge(this)
})

Given('the same answers were judged once', function (this: DepWorld) {
  answerAndJudge(this)
})

When('the steps that judge them change', function (this: DepWorld) {
  appendFileSync(join(game(this).root, 'arena', 'steps', 'requests.steps.ts'), '\n// changed\n')
})

When('the same answers are judged again', function (this: DepWorld) {
  answerAndJudge(this)
})

Then('the scenarios are run once', function (this: DepWorld) {
  assert.equal((this.notes.get('stats') as { runs: number }).runs, 1)
})

Then('the scenarios are run twice', function (this: DepWorld) {
  assert.equal((this.notes.get('stats') as { runs: number }).runs, 2)
})

Then('the scenarios are run again', function (this: DepWorld) {
  assert.equal((this.notes.get('stats') as { runs: number }).runs, 2)
})
