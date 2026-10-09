import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { DepWorld } from '../support/world'
import {
  Store, playDay, configWith, read, mazeSimilarity, select, claimAction,
  Instincts, MockTrainer, sleepNight, gate, MockPlayer,
  type DayResult, type MazeCore, type Trainer, type TrainJob, type Adapter, type NightReport,
  type Player, type PlayerView,
} from '../../../packages/loop/src/index'

const SEED = 1
const config = configWith()

function core(world: DepWorld): MazeCore {
  return world.notes.get('core') as MazeCore
}

/** Plays well for half the day, then slips — one move in seven made at random. */
class Slipping implements Player {
  private readonly honest = new MockPlayer(0.1)
  private episode = 0
  startEpisode() { this.honest.startEpisode(); this.episode++ }
  act(view: PlayerView, claims: string[], rng: Parameters<Player['act']>[2]) {
    const honest = this.honest.act(view, claims, rng)
    return this.episode > 25 && rng() < 0.15 ? { action: rng.pick(view.open) } : honest
  }
  endEpisode(reached: boolean) { return this.honest.endEpisode(reached) }
}

function settle(world: DepWorld, lastPlayer?: Player) {
  const store = new Store()
  const instincts = Instincts.start()
  let day: DayResult | undefined
  for (let d = 0; d < 3; d++) {
    if (d === 2) world.notes.set('provenBefore', select(store, config).map((e) => e.id))
    day = playDay({ seed: SEED, day: d, store, core: core(world), instincts: instincts.current(), player: d === 2 ? lastPlayer : undefined })
  }
  world.notes.set('store', store)
  world.notes.set('instincts', instincts)
  world.notes.set('day', day!)
  world.notes.set('wentToSleepWith', instincts.current().version)
  world.notes.set('proven', select(store, config).map((e) => e.id))
}

Given('a day of play that was settling down', function (this: DepWorld) {
  settle(this)
  const verdict = gate(this.notes.get('day') as DayResult, config)
  assert.ok(verdict.open, `the fixture day does not pass the gate: ${verdict.reason}`)
  assert.ok((this.notes.get('proven') as string[]).length > 0, 'the fixture proved no claims')
})

Given('a day of play that was getting worse', function (this: DepWorld) {
  settle(this, new Slipping())
  // still competent late in the day, but clearly worse than early: only the
  // question "is it converging?" can tell this day apart
  const verdict = gate(this.notes.get('day') as DayResult, config)
  assert.ok(verdict.painLate <= config.GATE_PAIN, `the fixture is not competent late (${verdict.painLate})`)
  assert.ok(verdict.painLate - verdict.painEarly > config.GATE_DRIFT, `the fixture did not get worse (${verdict.painEarly} → ${verdict.painLate})`)
  // the store went into the bad day holding claims worth absorbing, so refusing to sleep is a real refusal
  assert.ok((this.notes.get('provenBefore') as string[]).length > 0, 'the store held no proven claims going into the day')
})

// ── saboteurs ───────────────────────────────────────────────────────────

/** Learns everything except the habit one claim taught: wherever that claim applied, it takes up nothing. */
class LeavesOneOut implements Trainer {
  constructor(private readonly skip: string) {}
  train(job: TrainJob): Adapter {
    const honest = new MockTrainer().train(job)
    const skipped = job.taught.find((e) => e.id === this.skip)
    if (!skipped) return honest
    const action = claimAction(skipped.claim)
    const kept = honest.instincts.filter((i) => !(i.action === action && mazeSimilarity(i.key, skipped.key) >= config.SIM_MIN))
    return Instincts.version(job.version, job.from.version, kept)
  }
}

const OPPOSITE: Record<string, string> = { N: 'S', S: 'N', E: 'W', W: 'E' }

class Contrary implements Trainer {
  train(job: TrainJob): Adapter {
    const honest = new MockTrainer().train(job)
    return Instincts.version(job.version, job.from.version, honest.instincts.map((i) => ({ ...i, action: OPPOSITE[i.action] ?? i.action })))
  }
}

/** Learns nothing it was taught — only a habit that applies everywhere and walks away from a goal in the south-east. */
class Misleading implements Trainer {
  train(job: TrainJob): Adapter {
    return Instincts.version(job.version, job.from.version, [{ key: { features: {} }, action: 'N', from: 'nowhere' }])
  }
}

Given('a trainer that leaves one proven claim out', function (this: DepWorld) {
  const skip = (this.notes.get('proven') as string[])[0]!
  this.notes.set('skipped', skip)
  this.notes.set('trainer', new LeavesOneOut(skip))
})

Given('a trainer that teaches the opposite of what the claims say', function (this: DepWorld) {
  this.notes.set('trainer', new Contrary())
})

Given('a trainer that teaches only a habit leading away from the goal everywhere', function (this: DepWorld) {
  this.notes.set('trainer', new Misleading())
})

// ── the night ───────────────────────────────────────────────────────────

function night(world: DepWorld): NightReport {
  const report = sleepNight({
    store: world.notes.get('store') as Store,
    instincts: world.notes.get('instincts') as Instincts,
    day: world.notes.get('day') as DayResult,
    core: core(world),
    seed: (world.notes.get('seedOverride') as number | undefined) ?? SEED,
    trainer: world.notes.get('trainer') as Trainer | undefined,
  })
  world.notes.set('night', report)
  return report
}

When('the night comes', function (this: DepWorld) {
  night(this)
})

When('the night comes and the following days pass', function (this: DepWorld) {
  const report = night(this)
  assert.ok(report.absorbed.length > 0, `the night absorbed nothing: ${report.reason}`)
  const store = this.notes.get('store') as Store
  const instincts = this.notes.get('instincts') as Instincts
  const watched = report.absorbed[0]!
  this.notes.set('watched', watched)
  let days = 0
  for (let d = 3; d < 30 && store.entries.get(watched)!.strength >= config.S_INIT; d++, days++) {
    playDay({ seed: SEED, day: d, store, core: core(this), instincts: instincts.current() })
  }
  this.notes.set('daysToLetGo', days)
})

Then('the player wakes with a new version of its instincts', function (this: DepWorld) {
  const report = this.notes.get('night') as NightReport
  const instincts = this.notes.get('instincts') as Instincts
  assert.equal(report.slept, true, report.reason)
  assert.equal(report.undone, false, report.reason)
  assert.equal(instincts.current().version, (this.notes.get('wentToSleepWith') as number) + 1)
  assert.equal(report.wokeWith, instincts.current().version)
})

Then('the new version was taught only claims that had proved themselves', function (this: DepWorld) {
  const instincts = this.notes.get('instincts') as Instincts
  const proven = new Set(this.notes.get('proven') as string[])
  const fresh = instincts.current().instincts.filter((i) => !instincts.get(instincts.current().parent!).instincts.some((j) => j.from === i.from))
  assert.ok(fresh.length > 0, 'the new version learned nothing')
  for (const i of fresh) assert.ok(proven.has(i.from), `an instinct came from ${i.from}, which had not proved itself`)
})

Then('nothing the night was taught from contains a claim from the store', function (this: DepWorld) {
  const report = this.notes.get('night') as NightReport
  const store = this.notes.get('store') as Store
  const claims = new Set([...store.entries.values()].map((e) => e.claim))
  const ids = [...store.entries.keys()]
  assert.ok(report.dataset && report.dataset.sft.length > 0, 'the night was taught from nothing')
  const examples = [...report.dataset!.sft, ...report.dataset!.replay]
  for (const e of examples) {
    for (const claim of claims) assert.ok(!e.situation.includes(claim), `an example shows "${claim}": ${e.situation}`)
    for (const id of ids) assert.ok(!JSON.stringify(e).includes(id), 'an example names a store entry')
  }
  for (const p of report.dataset!.pairs) {
    for (const claim of claims) assert.ok(!p.situation.includes(claim))
  }
})

Then('a claim the new instincts carry is no longer offered as advice', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const watched = store.entries.get(this.notes.get('watched') as string)!
  assert.ok(watched.strength < config.S_INIT, `after ${this.notes.get('daysToLetGo')} days it is still held at ${watched.strength}`)
  const instincts = this.notes.get('instincts') as Instincts
  assert.ok(instincts.current().instincts.some((i) => i.from === watched.id), 'the instincts no longer carry it')
  const shown = read(store, watched.key, core(this).Rng(1), configWith({ EPS: 0 }), mazeSimilarity)
  assert.ok(shown.entries.every((e) => e.id !== watched.id), 'it is still offered as advice')
})

Then('it is still in the store, marked as absorbed', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const watched = store.entries.get(this.notes.get('watched') as string)
  assert.ok(watched, 'the absorbed claim was deleted')
  assert.equal(watched!.distilled, true)
})

Then('the player wakes with the instincts it went to sleep with', function (this: DepWorld) {
  const instincts = this.notes.get('instincts') as Instincts
  assert.equal(instincts.current().version, this.notes.get('wentToSleepWith'))
  assert.equal((this.notes.get('night') as NightReport).wokeWith, this.notes.get('wentToSleepWith'))
})

Then('I am told the day was not slept on, and why', function (this: DepWorld) {
  const report = this.notes.get('night') as NightReport
  assert.equal(report.slept, false)
  assert.ok(report.reason.length > 0 && /worse|short|fell/i.test(report.reason), report.reason)
})

Then('no claim is marked as absorbed', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  assert.equal([...store.entries.values()].filter((e) => e.distilled).length, 0)
  assert.deepEqual((this.notes.get('night') as NightReport).absorbed, [])
})

Then('that claim is still offered as advice', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const skipped = store.entries.get(this.notes.get('skipped') as string)!
  assert.ok(!skipped.archived && skipped.strength >= config.S_INIT)
  const shown = read(store, skipped.key, core(this).Rng(1), configWith({ EPS: 0 }), mazeSimilarity)
  assert.ok(shown.entries.some((e) => e.id === skipped.id), 'it is not offered')
})

Then('it is not marked as absorbed', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  assert.equal(store.entries.get(this.notes.get('skipped') as string)!.distilled, false)
})

// ── the record ──────────────────────────────────────────────────────────

Given('several days and nights have passed', function (this: DepWorld) {
  const store = new Store()
  const instincts = Instincts.start()
  for (let d = 0; d < 4; d++) {
    const day = playDay({ seed: SEED, day: d, store, core: core(this), instincts: instincts.current() })
    sleepNight({ store, instincts, day, core: core(this), seed: SEED })
  }
  assert.ok(store.log.some((e) => e.body.type === 'sleep'), 'no night is in the record')
  this.notes.set('store', store)
})


/** Never keeps its scratch and ignores the store: walks in loops all day. */
class Lost implements Player {
  startEpisode() {}
  endEpisode() { return [] }
  act(view: PlayerView, _claims: string[], rng: Parameters<Player['act']>[2]) { return { action: rng.pick(view.open) } }
}

Given('a day of play that failed from start to finish', function (this: DepWorld) {
  settle(this, new Lost())
  assert.ok((this.notes.get('provenBefore') as string[]).length > 0, 'the store held no proven claims going into the day')
  const day = this.notes.get('day') as DayResult
  assert.ok(day.metrics.painRateEarly > 0.9 && day.metrics.painRateLate > 0.9, 'the fixture day did not fail throughout')
})

Then('the rest of what the night learned is kept', function (this: DepWorld) {
  const report = this.notes.get('night') as NightReport
  const instincts = this.notes.get('instincts') as Instincts
  assert.equal(report.undone, false, `one missed claim cost the whole night: ${report.reason}`)
  assert.ok(report.absorbed.length > 0, 'nothing else was absorbed')
  assert.equal(instincts.current().version, (this.notes.get('wentToSleepWith') as number) + 1)
})

// Seed 2's first day: measured, letting every claim the instincts carry go at
// once costs held-out reward (−0.043 → −0.193); holding one back costs nothing.
Given('a day of play after which letting every proven claim go would leave the player worse', function (this: DepWorld) {
  const store = new Store()
  const instincts = Instincts.start()
  const day = playDay({ seed: 2, day: 0, store, core: core(this), instincts: instincts.current() })
  this.notes.set('store', store)
  this.notes.set('instincts', instincts)
  this.notes.set('day', day)
  this.notes.set('wentToSleepWith', instincts.current().version)
  this.notes.set('proven', select(store, config).map((e) => e.id))
  this.notes.set('seedOverride', 2)
})

Then('not every claim it was taught was let go', function (this: DepWorld) {
  const report = this.notes.get('night') as NightReport
  const heldBack = report.selected.filter((id) => !report.absorbed.includes(id))
  assert.ok(heldBack.length > 0, 'every claim was let go')
  this.notes.set('heldBack', heldBack)
})

Then('a claim it held back is still offered as advice', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const heldBack = (this.notes.get('heldBack') as string[]).map((id) => store.entries.get(id)!)
  const offered = heldBack.filter((e) => {
    if (e.distilled || e.archived) return false
    const shown = read(store, e.key, core(this).Rng(1), configWith({ EPS: 0 }), mazeSimilarity)
    return shown.entries.some((s) => s.id === e.id)
  })
  assert.ok(offered.length > 0, 'no held-back claim is still offered')
})

Then('I am told the night was undone because it taught against its own claims', function (this: DepWorld) {
  const report = this.notes.get('night') as NightReport
  assert.equal(report.undone, true, `the night was kept: ${report.reason}`)
  assert.ok(/contradict/.test(report.reason), `the reason given was: ${report.reason}`)
})

Then('I am told the night was undone because its instincts, on their own, did worse', function (this: DepWorld) {
  const report = this.notes.get('night') as NightReport
  assert.equal(report.undone, true, `the night was kept: ${report.reason}`)
  assert.ok(/on its own/.test(report.reason), `the reason given was: ${report.reason}`)
})
